import Car from './Car';
import IResource from './resourse';

export default class ResourceFactory {
    static getResourceCar(): IResource {
        return new Car();
    }
}