import Car from './car';
import IResource from './resourse';

export default class ResourceFactory {
    static getResourceCar(): IResource {
        return new Car();
    }
}