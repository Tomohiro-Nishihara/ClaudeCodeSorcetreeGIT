import { createElement } from 'lwc';
import { registerApexTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import getFacilities from '@salesforce/apex/FacilityMonthlyCalendarController.getFacilities';
import getFacilityEvents from '@salesforce/apex/FacilityMonthlyCalendarController.getFacilityEvents';
import FacilityMonthlyCalendar from 'c/facilityMonthlyCalendar';

const getFacilitiesAdapter = registerApexTestWireAdapter(getFacilities);
const getFacilityEventsAdapter = registerApexTestWireAdapter(getFacilityEvents);

describe('c-facility-monthly-calendar', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('loads facility options and shows a monthly calendar after selection', async () => {
        const element = createElement('c-facility-monthly-calendar', {
            is: FacilityMonthlyCalendar
        });
        document.body.appendChild(element);

        getFacilitiesAdapter.emit([
            { Id: '001000000000001AAA', Name: '東京施設' }
        ]);
        await Promise.resolve();

        const facilityPicker = element.shadowRoot.querySelector(
            'lightning-combobox[name="facility"]'
        );
        expect(facilityPicker.options).toEqual([
            { label: '東京施設', value: '001000000000001AAA' }
        ]);

        facilityPicker.dispatchEvent(
            new CustomEvent('change', {
                detail: { value: '001000000000001AAA' }
            })
        );
        await Promise.resolve();

        expect(getFacilityEventsAdapter.getLastConfig()).toEqual(
            expect.objectContaining({
                facilityId: '001000000000001AAA'
            })
        );
        getFacilityEventsAdapter.emit([]);
        await Promise.resolve();

        expect(element.shadowRoot.querySelector('h2').textContent).toMatch(
            /^\d{4}年\d{1,2}月$/
        );
        expect(element.shadowRoot.querySelectorAll('.weekday')).toHaveLength(7);
        expect(element.shadowRoot.querySelectorAll('.calendar-day').length).toBeGreaterThanOrEqual(
            28
        );
    });

    it('moves to the previous month when requested', async () => {
        const element = createElement('c-facility-monthly-calendar', {
            is: FacilityMonthlyCalendar
        });
        document.body.appendChild(element);
        getFacilitiesAdapter.emit([]);
        await Promise.resolve();
        getFacilitiesAdapter.emit([
            { Id: '001000000000001AAA', Name: '東京施設' }
        ]);
        await Promise.resolve();

        element.shadowRoot
            .querySelector('lightning-combobox[name="facility"]')
            .dispatchEvent(
                new CustomEvent('change', {
                    detail: { value: '001000000000001AAA' }
                })
            );
        getFacilityEventsAdapter.emit([]);
        await Promise.resolve();

        const currentMonth = new Date();
        const previousMonth = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() - 1,
            1
        );
        const expectedLabel = `${previousMonth.getFullYear()}年${previousMonth.getMonth() + 1}月`;

        element.shadowRoot
            .querySelector('lightning-button-icon[alternative-text="前月"]')
            .click();
        await Promise.resolve();

        expect(element.shadowRoot.querySelector('h2').textContent).toBe(expectedLabel);
    });
});
