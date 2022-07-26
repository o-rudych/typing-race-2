import { getRandomJoke } from '../services/jokeService';
import { User, userService } from '../services/userService';
import { BOT_GREETING } from './constants';

const getUserTitle = userService.getUserTitle;

class Bot {
    getGreeting() {
        return BOT_GREETING;
    }

    protected getNumberOfRacesString = (number: number) => {
        switch (number % 10) {
            case 1:
                return 'гонка';
            case 2:
            case 3:
            case 4:
                return 'гонки';
            default:
                return 'гонок';
        }
    }

    protected getNumberOfStepsString = (number: number) => {
        switch (number % 100) {
            case 11:
            case 12:
            case 13:
            case 14:
                return 'кроків';
            default:
                break;
        }
        switch (number % 10) {
            case 1:
                return 'крок';
            case 2:
            case 3:
            case 4:
                return 'кроки';
            default:
                return 'кроків';
        }
    }

    protected getSecondsString = (seconds: number) => {
        switch (seconds % 100) {
            case 11:
            case 12:
            case 13:
            case 14: return 'секунд';
            default:
        }
        switch (seconds % 10) {
            case 1: return 'секунда';
            case 2:
            case 3:
            case 4: return 'секунди';
            default: return 'секунд';
        }
    }

    protected getGameTimeString = (user: User): string => {
        switch (user.gameTime) {
            case 0:
                return 'Не дійшовши до фінішу.';
            default:
                return `Час ${Math.round(user.gameTime / 1000)} c`;
        }
    }

    getMessageUsersAreReady(users: User[]): string {
        let message = 'А тим часом на старті вже готові рушити учасники:</br>';
        users.forEach((user, index, array) => {
            message = message.concat(`${getUserTitle(user)} під номером ${index + 1}`);
            if (user.numberOfRaces > 0)
                message = message.concat(` (на рахунку вже ${user.numberOfRaces} ${this.getNumberOfRacesString(user.numberOfRaces)})`);
            if (index < array.length - 1) message = message.concat(',</br>');
        });
        return message;
    }

    getCurrentStateOfUsers(users: User[], textLength: number, seconds: number): string {
        if (users.length === 0) return '';
        let message = '';

        const finishers = userService.getFinishers(users);
        const notFinishers = userService.getNotFinishers(users);

        const getTextStepsLeft = (user: User): string => {
            const stepsLeft = textLength - user.currentIndex;
            return `йому залишилося ${stepsLeft} ${this.getNumberOfStepsString(stepsLeft)}`;
        }

        switch (finishers.length) {
            case 1:
                message = `${getUserTitle(finishers[0])} вже фінішував першим!`;
                break;
            case 0:
                break;
            default:
                message = 'На фініші вже чекають';
                finishers.forEach(user => message = message.concat(`</br>${getUserTitle(user)}`));
                break;
        }

        switch (notFinishers.length) {
            case 1:
                message = message.concat(`</br>Рухається лише ${getUserTitle(notFinishers[0])} і ${getTextStepsLeft(notFinishers[0])}`);
                break;
            case 0:
                break;
            default: {
                const firstUser = notFinishers.shift() as User;
                message = message.concat(`</br>До фінішу рухається попереду ${getUserTitle(firstUser)}, ${getTextStepsLeft(firstUser)}`);
                let prevIndex = firstUser.currentIndex;
                notFinishers.forEach(user => {
                    const diff = prevIndex - user.currentIndex;
                    if (diff === 0) {
                        message = message.concat(`</br>разом із ним йде ${getUserTitle(user)}`);
                    } else {
                        message = message.concat(`</br>за ним йде ${getUserTitle(user)}, відстає на ${diff} ${this.getNumberOfStepsString(diff)}`);
                    }
                    prevIndex = user.currentIndex;
                });
                break;
            }
        }

        message = message.concat(`</br>До кінця гонки лишилося ${seconds} ${this.getSecondsString(seconds)}`);

        return message;
    }

    getMessageGameOverTimeIsUp = (): string => {
        return `Час вичерпано!</br>Хто не встиг дійти до фінішу - треба краще старатися.</br>Зараз ми дізнаємося результати перегонів!`;
    }

    getMessageUserIsFinifing(user: User, usersInRoom: User[]): string {
        const finishers = userService.getFinishers(usersInRoom);

        switch (finishers.length) {
            case 1: return `${getUserTitle(user)} першим перетинає фінішну пряму!`;
                break;
            case usersInRoom.length: return `Останнім завершує коло ${getUserTitle(user)}, і зараз ми дізнаємося результати!`;
                break;
            default: return `${getUserTitle(user)} перетинає фінішну пряму!`;
        }
    }

    getMessageUserEntersFinishLine(notFinishers: User[]): string {
        const firstUser = notFinishers.shift() as User;
        let message = `Попереду ${getUserTitle(firstUser)}, і схоже, що він може першим дійти до фінішу!`;

        if (notFinishers.length === 1) {
            message = message.concat(`</br>А ${getUserTitle(notFinishers[0])} може стати другим`);
        } else if (notFinishers.length >= 2) {
            message = message.concat(`</br>А за друге місце змагаються ${getUserTitle(notFinishers[0])} та ${getUserTitle(notFinishers[1])}`);
        }
        return message;
    }

    getMessageGameOver(winners: User[]): string {
        let message = `Переможцем стає ${getUserTitle(winners[0])}! ${this.getGameTimeString(winners[0])}`;

        if (winners.length >= 2) {
            message = message.concat(`</br>${getUserTitle(winners[1])} виборює срібло! ${this.getGameTimeString(winners[1])}`);
        }
        if (winners.length >= 3) {
            message = message.concat(`</br>${getUserTitle(winners[2])} отримує бронзу! ${this.getGameTimeString(winners[2])}`);
        }
        message = message.concat('</br>Вітаємо переможців!');
        return message;
    }

    getRandomComment = (): string => getRandomJoke() as string;
}

export default new Bot();