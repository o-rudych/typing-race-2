import Resource from './resourse';

export default class Car extends Resource {
    constructor() {
        super()
        this.data = [
            'McLaren',
            'Aston Martin',
            'Ferrari',
            'Saleen',
            'Porsche',
            'Ford GT',
            'Maserati',
            'Koenigsegg',
            'Lamborghini',
            'Bugatti',
            'Chevrolet',
            'Audi',
            'BMW',
            'Lexus',
            'Jaguar'
        ];
    }
}