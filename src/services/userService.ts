import ResourceFactory from "../factory/resourse-factory";
export type User = {
    username: string;
    activeRoom: string;
    isReady: boolean;
    currentIndex: number;
    gameTime: number;
    car: string;
    numberOfRaces: number;
}

const Car = ResourceFactory.getResourceCar();

class UserService {

    private usersMap: Map<string, User> = new Map();

    createUser(name: string): User {
        const user: User = {
            username: name,
            activeRoom: '',
            isReady: false,
            currentIndex: 0,
            gameTime: 0,
            car: Car.getRandom() as string,
            numberOfRaces: 0
        };
        this.usersMap.set(name, user);
        return user;
    }
    allUsersAreReady(roomName: string): boolean {
        return [...this.usersMap.values()]
            .filter(user => user.activeRoom === roomName)
            .every(user => user.isReady);
    }

    getUserByName(name: string): User | undefined {
        return this.usersMap.get(name);
    }

    userExist(name: string): boolean {
        if (this.getUserByName(name)) return true
        else return false;
    }
    deleteUser(name: string): void {
        if (this.userExist(name)) {
            this.usersMap.delete(name);
        }
    }

    getFinishers(users: User[]) {
        return users
            .filter(user => user.gameTime > 0)
            .sort((a: User, b: User) => a.gameTime - b.gameTime);
    }

    getNotFinishers(users: User[]) {
        return users
            .filter(user => user.gameTime === 0)
            .sort((a: User, b: User) => b.currentIndex - a.currentIndex);
    }

    getUserTitle(user: User) {
        return `<b>${user.username}</b> на <b>${user.car}</b>`;
    }
}

export const userService = new UserService();