import { createElement } from 'lwc';
import SimpleCounter from 'c/simpleCounter';

describe('c-simple-counter', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('increments, decrements, and resets the count', async () => {
        const element = createElement('c-simple-counter', {
            is: SimpleCounter
        });
        document.body.appendChild(element);

        const buttons = element.shadowRoot.querySelectorAll('lightning-button');
        const count = element.shadowRoot.querySelector('p');

        expect(count.textContent).toBe('0');

        buttons[1].click();
        await Promise.resolve();
        expect(count.textContent).toBe('1');

        buttons[0].click();
        await Promise.resolve();
        expect(count.textContent).toBe('0');

        buttons[1].click();
        await Promise.resolve();
        buttons[2].click();
        await Promise.resolve();
        expect(count.textContent).toBe('0');
    });
});
