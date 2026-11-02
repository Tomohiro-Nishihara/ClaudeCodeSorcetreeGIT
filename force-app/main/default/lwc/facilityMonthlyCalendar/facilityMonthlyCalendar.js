import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getFacilities from '@salesforce/apex/FacilityMonthlyCalendarController.getFacilities';
import getFacilityEvents from '@salesforce/apex/FacilityMonthlyCalendarController.getFacilityEvents';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_NAMES = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月'
];

export default class FacilityMonthlyCalendar extends LightningElement {
    selectedFacilityId = '';
    currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    facilityOptions = [];
    events = [];
    isLoading = false;

    @wire(getFacilities)
    wiredFacilities({ data, error }) {
        if (data) {
            this.facilityOptions = data.map((facility) => ({
                label: facility.Name,
                value: facility.Id
            }));
        } else if (error) {
            this.showError('施設を取得できません', error);
        }
    }

    @wire(getFacilityEvents, {
        facilityId: '$facilityIdForEvents',
        monthStart: '$monthStart'
    })
    wiredEvents({ data, error }) {
        this.isLoading = false;
        if (data) {
            this.events = data;
        } else if (error) {
            this.events = [];
            this.showError('予定を取得できません', error);
        }
    }

    get weekdays() {
        return WEEKDAYS;
    }

    get facilityIdForEvents() {
        return this.selectedFacilityId || undefined;
    }

    get monthStart() {
        const year = this.currentMonth.getFullYear();
        const month = String(this.currentMonth.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    }

    get monthLabel() {
        return `${this.currentMonth.getFullYear()}年${MONTH_NAMES[this.currentMonth.getMonth()]}`;
    }

    get calendarWeeks() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
        const eventsByDate = new Map();

        for (const event of this.events) {
            const dateEvents = eventsByDate.get(event.dateKey) || [];
            dateEvents.push({
                id: event.id,
                subject: event.subject || '（件名なし）',
                timeLabel: event.timeLabel || '終日'
            });
            eventsByDate.set(event.dateKey, dateEvents);
        }

        const days = [];
        for (let index = 0; index < cellCount; index++) {
            const date = new Date(year, month, 1 - firstWeekday + index);
            const dateKey = this.toDateKey(date);
            const isCurrentMonth = date.getMonth() === month;
            days.push({
                key: dateKey,
                dayNumber: date.getDate(),
                isCurrentMonth,
                className: isCurrentMonth
                    ? 'calendar-day'
                    : 'calendar-day adjacent-month',
                ariaLabel: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
                events: eventsByDate.get(dateKey) || []
            });
        }

        const weeks = [];
        for (let index = 0; index < days.length; index += 7) {
            weeks.push(days.slice(index, index + 7));
        }
        return weeks;
    }

    handleFacilityChange(event) {
        this.selectedFacilityId = event.detail.value;
        this.events = [];
        this.isLoading = Boolean(this.selectedFacilityId);
    }

    handlePreviousMonth() {
        this.changeMonth(-1);
    }

    handleNextMonth() {
        this.changeMonth(1);
    }

    changeMonth(offset) {
        this.currentMonth = new Date(
            this.currentMonth.getFullYear(),
            this.currentMonth.getMonth() + offset,
            1
        );
        this.events = [];
        this.isLoading = Boolean(this.selectedFacilityId);
    }

    toDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    showError(title, error) {
        const message = error.body?.message || error.message || '予期しないエラーが発生しました。';
        this.dispatchEvent(new ShowToastEvent({ title, message, variant: 'error' }));
    }
}
