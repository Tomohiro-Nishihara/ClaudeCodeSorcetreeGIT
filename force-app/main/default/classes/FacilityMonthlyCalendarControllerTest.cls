@IsTest
private class FacilityMonthlyCalendarControllerTest {
    @IsTest
    static void listsAccountsAndEventsForSelectedFacilityAndMonth() {
        Account facility = new Account(Name = '東京施設');
        insert facility;

        Date monthStart = Date.newInstance(2026, 11, 1);
        Event timedEvent = new Event(
            WhatId = facility.Id,
            Subject = '定期点検',
            StartDateTime = DateTime.newInstance(2026, 11, 12, 9, 0, 0),
            EndDateTime = DateTime.newInstance(2026, 11, 12, 10, 0, 0)
        );
        Event outsideEvent = new Event(
            WhatId = facility.Id,
            Subject = '翌月の予定',
            StartDateTime = DateTime.newInstance(2026, 12, 2, 9, 0, 0),
            EndDateTime = DateTime.newInstance(2026, 12, 2, 10, 0, 0)
        );
        insert new List<Event>{ timedEvent, outsideEvent };

        Test.startTest();
        List<Account> facilities =
            FacilityMonthlyCalendarController.getFacilities();
        List<FacilityCalendarEvent> events =
            FacilityMonthlyCalendarController.getFacilityEvents(facility.Id, monthStart);
        Test.stopTest();

        System.assertEquals(1, facilities.size());
        System.assertEquals(facility.Id, facilities[0].Id);
        System.assertEquals(1, events.size());
        System.assertEquals(timedEvent.Id, events[0].id);
        System.assertEquals('定期点検', events[0].subject);
        System.assertEquals('2026-11-12', events[0].dateKey);
        System.assertEquals('09:00', events[0].timeLabel);
    }
}
