import { LightningElement } from 'lwc';

export default class SimpleCounter extends LightningElement {
    count = 0;

    increment() {
        this.count += 1;
    }

    decrement() {
        this.count -= 1;
    }

    reset() {
        this.count = 0;
    }
}
