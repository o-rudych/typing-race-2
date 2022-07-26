import { Server } from 'socket.io';
import * as config from './config';
import { User, userService } from '../services/userService';
import { texts } from '../data';
import { bot } from '../bot';
import {
	MESSAGE_TO_THE_START,
	MESSAGE_ATTENTION,
	MESSAGE_GO,
	MESSAGE_GAME_STARTED
} from '../bot/constants';

type Room = {
	name: string;
	users: User[];
	numberOfUsers: number;
	availableToJoin: boolean;
}

let roomsMap: Map<string, Room> = new Map();
let textLength: number = 0;
let startDate: number = 0;

export default (io: Server) => {
	io.on("connection", socket => {

		const username: string = socket.handshake.query.username as string;
		let currentUser: User = userService.getUserByName(username) as User;

		if (currentUser) {
			socket.emit("USER_EXIST", username);
			return;
		}
		currentUser = userService.createUser(username);

		let lastTimeBotMessageSent: number;
		const sendMessageToBot = (name: string, message: string): void => {
			io.to(name).emit("BOT_MESSAGE", message);
			lastTimeBotMessageSent = new Date().getTime();
		}

		socket.emit("UPDATE_ROOMS", [...roomsMap.values()]);

		socket.on("ADD_ROOM", name => {
			const roomFound: Room = roomsMap.get(name) as Room;
			if (roomFound) {
				socket.emit("ROOM_EXIST", name);
				return;
			}
			const newRoom: Room = {
				name: name,
				users: [currentUser],
				numberOfUsers: 1,
				availableToJoin: true
			};
			roomsMap.set(name, newRoom);
			currentUser.activeRoom = name;
			socket.join(name);

			socket.broadcast.emit("UPDATE_ROOMS", [...roomsMap.values()]);
			socket.emit("ADD_ROOM_DONE", newRoom);

			socket.emit("BOT_MESSAGE", bot.getGreeting());
		});

		socket.on("JOIN_ROOM", name => {
			const currentRoom: Room = roomsMap.get(name) as Room;
			if (!currentRoom) {
				socket.emit("ROOM_DOES_NOT_EXIST", name);
				return;
			}
			if (currentRoom.numberOfUsers === config.MAXIMUM_USERS_FOR_ONE_ROOM) {
				socket.emit("MAXIMUM_USERS_FOR_ONE_ROOM", currentRoom);
				return;
			}
			socket.join(name);
			currentRoom.users.push(currentUser);
			currentRoom.numberOfUsers++;
			currentUser.activeRoom = name;
			if (currentRoom.numberOfUsers === config.MAXIMUM_USERS_FOR_ONE_ROOM) {
				currentRoom.availableToJoin = false;
				socket.broadcast.emit("UPDATE_ROOMS", [...roomsMap.values()]);
			}

			socket.emit("JOIN_ROOM_DONE", currentRoom);
			socket.broadcast.to(name).emit("NEW_USER_JOINED", currentUser);
			socket.broadcast.emit("NUMBER_OF_USERS_IN_ROOM_CHANGED", currentRoom);

			socket.emit("BOT_MESSAGE", bot.getGreeting());
		});

		const startGameTimer = (name: string, seconds: number) => {
			setTimeout(decreaseGameTimer, 1000, name, seconds);
			io.to(name).emit("GAME_TIMER_CHANGED", seconds);

			setTimeout(() => {
				sendMessageToBot(name, MESSAGE_GAME_STARTED);
			}, 2000);
		}
		const getWinners = (users: User[]): User[] => {
			const finishers = userService.getFinishers(users);
			const notFinishers = userService.getNotFinishers(users);
			const allUsers = finishers.concat(notFinishers);
			return allUsers;
		}

		const finishGame = (name: string) => {
			const users = roomsMap.get(name)?.users as User[];
			const winners = getWinners([...users]);
			io.to(name).emit("GAME_OVER", { name, winners });
			setTimeout(() => {
				sendMessageToBot(name, bot.getMessageGameOver(winners));
			}, 2000);
			const room: Room = roomsMap.get(name) as Room;
			room.availableToJoin = true;
			socket.broadcast.emit("UPDATE_ROOMS", [...roomsMap.values()]);
			users.forEach(user => user.numberOfRaces++);
		}

		const decreaseGameTimer = (name: string, seconds: number) => {

			const currentRoom: Room = roomsMap.get(name) as Room;
			if (currentRoom && currentRoom.availableToJoin === true) {
				// The game is finished
				return;
			}

			seconds--;
			io.to(name).emit("GAME_TIMER_CHANGED", seconds);
			if (seconds > 0) setTimeout(decreaseGameTimer, 1000, name, seconds)
			else {
				sendMessageToBot(name, bot.getMessageGameOverTimeIsUp());
				finishGame(name);
				return;
			}

			if ((config.SECONDS_FOR_GAME - seconds) % config.SECONDS_BOT_UPDATES_CURRENT_STATE === 0) {
				sendMessageToBot(name,
					bot.getCurrentStateOfUsers(currentRoom.users, textLength, seconds)
				);
			}
			const timeBotPause = new Date().getTime() - lastTimeBotMessageSent;
			if (timeBotPause > config.SECONDS_BOT_PAUSE_BEFORE_JOKE * 1000) {
				sendMessageToBot(name, bot.getRandomComment());
			}
		}

		const decreaseTimer = (name: string, seconds: number) => {
			seconds--;
			io.to(name).emit("TIMER_CHANGED", seconds);
			if (seconds > 0) setTimeout(decreaseTimer, 1000, name, seconds)
			else {
				io.to(name).emit("TIMER_IS_UP", name);
				startGameTimer(name, config.SECONDS_FOR_GAME);
			}
		}

		const startTimer = (name: string, seconds: number) => {
			setTimeout(decreaseTimer, 1000, name, seconds);
		}
		const checkIfStartTimer = (name: string) => {
			if (userService.allUsersAreReady(name)) {

				const currentRoom: Room = roomsMap.get(name) as Room;
				if (!currentRoom) return;

				currentRoom.availableToJoin = false;
				socket.broadcast.emit("UPDATE_ROOMS", [...roomsMap.values()]);


				const seconds = config.SECONDS_TIMER_BEFORE_START_GAME;
				const textId = Math.floor(Math.random() * texts.length);
				textLength = texts[textId].length;
				startTimer(name, seconds);
				startDate = new Date().getTime();

				io.to(name).emit("TIMER_STARTED", { seconds, textId });

				sendMessageToBot(name, bot.getMessageUsersAreReady(currentRoom.users));
				if (seconds > 3) {
					setTimeout(() => {
						sendMessageToBot(name, MESSAGE_TO_THE_START);
					}, (seconds - 2) * 1000);
					setTimeout(() => {
						sendMessageToBot(name, MESSAGE_ATTENTION);
					}, (seconds - 1) * 1000);
				}
				setTimeout(() => {
					sendMessageToBot(name, MESSAGE_GO);
				}, seconds * 1000);

			}
		}
		socket.on("CHANGE_READY", name => {
			currentUser.isReady = !currentUser.isReady;
			io.to(name).emit("READY_CHANGED", currentUser);
			if (currentUser.isReady) {
				currentUser.currentIndex = 0;
				currentUser.gameTime = 0;
			}
			checkIfStartTimer(name);
		});

		socket.on("SET_NOT_READY", name => {
			currentUser.isReady = false;
			io.to(name).emit("READY_CHANGED", currentUser);
			currentUser.currentIndex = 0;
			io.emit("PROGRESS_CHANGED", {
				username: currentUser.username,
				progress: 0
			});
		});

		const quitRoom = (name: string): void => {
			const room: Room = roomsMap.get(name) as Room;
			if (!room) return;

			const index = room.users.indexOf(currentUser);
			if (index !== -1) {
				room.users.splice(index, 1);
				room.numberOfUsers = room.users.length;
				currentUser.activeRoom = "";
				currentUser.isReady = false;
			}
			if (!room.availableToJoin && room.numberOfUsers < config.MAXIMUM_USERS_FOR_ONE_ROOM) {
				room.availableToJoin = true;
				socket.broadcast.emit("UPDATE_ROOMS", [...roomsMap.values()]);
			}
			if (room.numberOfUsers === 0) {
				roomsMap.delete(name);
			}
			socket.broadcast.to(name).emit("USER_LEFT", currentUser);
			checkIfStartTimer(name);

		}

		socket.on("QUIT_ROOM", name => {
			socket.leave(name);
			quitRoom(name);
			socket.emit("UPDATE_ROOMS", [...roomsMap.values()]);
			socket.broadcast.emit("UPDATE_ROOMS", [...roomsMap.values()]);
		});

		socket.on("SUCCESSFUL_SYMBOL", currentIndex => {
			currentUser.currentIndex = currentIndex;
			const progress = Math.round(100 * (currentIndex + 1) / textLength);
			io.emit("PROGRESS_CHANGED", {
				username: currentUser.username,
				progress: progress
			});
			const usersInRoom = roomsMap.get(currentUser.activeRoom)?.users as User[];
			const notFinishers = userService.getNotFinishers(usersInRoom);

			// The leader is nearing the finish
			if (currentIndex === textLength - 1 - config.STEPS_AWAY_FROM_FINISH_TO_CHECK_LEADER
				&& userService.getFinishers(usersInRoom).length === 0
				&& notFinishers[0] === currentUser) {
				sendMessageToBot(
					currentUser.activeRoom,
					bot.getMessageUserEntersFinishLine(notFinishers)
				);
			}

			if (currentIndex === textLength - 1) {
				currentUser.gameTime = new Date().getTime() - startDate;

				sendMessageToBot(
					currentUser.activeRoom,
					bot.getMessageUserIsFinifing(currentUser, usersInRoom)
				);

				if (usersInRoom.every(user => user.currentIndex === textLength - 1)) {
					finishGame(currentUser.activeRoom);
				}
			}
		});

		socket.on("disconnect", (reason) => {
			quitRoom(currentUser.activeRoom);
			userService.deleteUser(username);
			io.emit("UPDATE_ROOMS", [...roomsMap.values()]);
		});

	});
};
