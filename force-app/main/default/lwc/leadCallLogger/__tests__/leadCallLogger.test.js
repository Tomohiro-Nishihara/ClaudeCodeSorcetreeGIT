import { createElement } from 'lwc';
import { registerApexTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import logCall from '@salesforce/apex/LeadCallLoggerController.logCall';
import getCallResultOptions from '@salesforce/apex/LeadCallLoggerController.getCallResultOptions';
import LeadCallLogger from 'c/leadCallLogger';

const getCallResultOptionsAdapter = registerApexTestWireAdapter(getCallResultOptions);

jest.mock(
    '@salesforce/apex/LeadCallLoggerController.logCall',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/LeadCallLoggerController.getCallResultOptions',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

const emitCallResultValues = async () => {
    getCallResultOptionsAdapter.emit([
        { label: '不在', value: '不在' },
        { label: '折返し依頼', value: '折返し依頼' },
        { label: '担当者不在', value: '担当者不在' },
        { label: 'アポ獲得', value: 'アポ獲得' },
        { label: '見込みなし', value: '見込みなし' }
    ]);
    await Promise.resolve();
    await Promise.resolve();
};

describe('c-lead-call-logger', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        logCall.mockReset();
        getCallResultOptions.mockReset();
    });

    it('renders the call result, memo, and optional next-call date fields', async () => {
        const element = createElement('c-lead-call-logger', {
            is: LeadCallLogger
        });
        document.body.appendChild(element);
        await emitCallResultValues();

        const callResult = element.shadowRoot.querySelector(
            'lightning-combobox[name="callResult"]'
        );
        const memo = element.shadowRoot.querySelector(
            'lightning-textarea[name="memo"]'
        );
        const nextCallDate = element.shadowRoot.querySelector(
            'lightning-input[name="nextCallDate"]'
        );

        expect(callResult.label).toBe('架電結果');
        expect(callResult.options.map((option) => option.label)).toEqual([
            '不在',
            '折返し依頼',
            '担当者不在',
            'アポ獲得',
            '見込みなし'
        ]);
        expect(memo.label).toBe('メモ');
        expect(nextCallDate.type).toBe('date');
        expect(nextCallDate.label).toBe('次回架電日（任意）');
        expect(element.shadowRoot.querySelector('lightning-button').label).toBe(
            '記録する'
        );
    });

    it('saves the call details for the current lead', async () => {
        logCall.mockResolvedValue();

        const element = createElement('c-lead-call-logger', {
            is: LeadCallLogger
        });
        element.recordId = '00Q000000000001AAA';
        document.body.appendChild(element);
        await emitCallResultValues();

        const callResult = element.shadowRoot.querySelector(
            'lightning-combobox[name="callResult"]'
        );
        const memo = element.shadowRoot.querySelector(
            'lightning-textarea[name="memo"]'
        );
        const nextCallDate = element.shadowRoot.querySelector(
            'lightning-input[name="nextCallDate"]'
        );
        callResult.dispatchEvent(
            new CustomEvent('change', { detail: { value: 'アポ獲得' } })
        );
        memo.dispatchEvent(
            new CustomEvent('change', { detail: { value: '来週訪問予定' } })
        );
        nextCallDate.dispatchEvent(
            new CustomEvent('change', { detail: { value: '2026-11-02' } })
        );
        callResult.value = 'アポ獲得';
        nextCallDate.value = '2026-11-02';

        element.shadowRoot.querySelector('lightning-button').click();
        await Promise.resolve();
        await Promise.resolve();

        expect(logCall).toHaveBeenCalledWith({
            leadId: '00Q000000000001AAA',
            callResult: 'アポ獲得',
            memo: '来週訪問予定',
            nextCallDate: '2026-11-02'
        });
    });
});