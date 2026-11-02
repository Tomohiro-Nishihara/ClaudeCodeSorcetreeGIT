import { createElement } from 'lwc';
import SimpleGreeting from 'c/simpleGreeting';

describe('c-simple-greeting', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('updates the greeting when a name is entered', async () => {
        const element = createElement('c-simple-greeting', {
            is: SimpleGreeting
        });
        document.body.appendChild(element);

        const input = element.shadowRoot.querySelector('lightning-input');
        const greeting = element.shadowRoot.querySelector('p');

        expect(greeting.textContent).toBe('お名前を入力してください。');

        input.value = '太郎';
        input.dispatchEvent(new CustomEvent('change'));
        await Promise.resolve();

        expect(greeting.textContent).toBe('こんにちは、太郎さん！');
    });

    it('trims whitespace from the entered name', async () => {
        const element = createElement('c-simple-greeting', {
            is: SimpleGreeting
        });
        document.body.appendChild(element);

        const input = element.shadowRoot.querySelector('lightning-input');
        input.value = ' 花子 ';
        input.dispatchEvent(new CustomEvent('change'));
        await Promise.resolve();

        expect(element.shadowRoot.querySelector('p').textContent).toBe('こんにちは、花子さん！');
    });
});
