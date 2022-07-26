import { sample } from "lodash";

interface IResource {
    data: string[]
    getRandom(): string | undefined;
}

export default class Resource implements IResource {
    data: string[] = [];
    getRandom(): string | undefined {
        return sample(this.data);
    }

}