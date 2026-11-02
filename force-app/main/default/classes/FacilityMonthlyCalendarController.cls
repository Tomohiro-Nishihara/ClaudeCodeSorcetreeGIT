public with sharing class FacilityMonthlyCalendarController {
    @AuraEnabled(cacheable=true)
    public static List<Account> getFacilities() {
        return [
            SELECT Id, Name
            FROM Account
            WITH USER_MODE
            ORDER BY Name
            LIMIT 1000
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<FacilityCalendarEvent> getFacilityEvents(
        Id facilityId,
        Date monthStart
    ) {
        if (facilityId == null || facilityId.getSObjectType() != Account.SObjectType) {
            throw new AuraHandledException('施設を選択してください。');
        }
        if (monthStart == null || monthStart.day() != 1) {
            throw new AuraHandledException('表示する月を特定できません。');
        }

        Date monthEnd = monthStart.addMonths(1);
        DateTime startDateTime = DateTime.newInstance(
            monthStart,
            Time.newInstance(0, 0, 0, 0)
        );
        DateTime endDateTime = DateTime.newInstance(
            monthEnd,
            Time.newInstance(0, 0, 0, 0)
        );

        List<Event> records = [
            SELECT Id, Subject, ActivityDate, StartDateTime, EndDateTime, IsAllDayEvent
            FROM Event
            WHERE WhatId = :facilityId
                AND (
                    (ActivityDate >= :monthStart AND ActivityDate < :monthEnd)
                    OR (StartDateTime < :endDateTime AND EndDateTime >= :startDateTime)
                )
            WITH USER_MODE
            ORDER BY StartDateTime
            LIMIT 500
        ];

        List<FacilityCalendarEvent> calendarEvents = new List<FacilityCalendarEvent>();
        for (Event eventRecord : records) {
            Date eventDate = eventRecord.IsAllDayEvent
                ? eventRecord.ActivityDate
                : eventRecord.StartDateTime.date();
            String timeLabel = eventRecord.IsAllDayEvent
                ? '終日'
                : eventRecord.StartDateTime.format('HH:mm');
            calendarEvents.add(
                new FacilityCalendarEvent(
                    eventRecord.Id,
                    eventRecord.Subject,
                    String.valueOf(eventDate),
                    timeLabel
                )
            );
        }
        return calendarEvents;
    }
}
