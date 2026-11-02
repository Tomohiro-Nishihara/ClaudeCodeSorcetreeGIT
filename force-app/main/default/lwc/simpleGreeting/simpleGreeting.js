import { LightningElement } from 'lwc';

export default class SimpleGreeting extends LightningElement {
    name = '';

    get greeting() {
        return this.name ? `こんにちは、${this.name}さん！` : 'お名前を入力してください。';
    }

    handleNameChange(event) {
        this.name = event.target.value.trim();
    }
}
