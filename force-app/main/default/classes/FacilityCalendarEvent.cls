public class FacilityCalendarEvent {
    @AuraEnabled
    public Id id { get; set; }

    @AuraEnabled
    public String subject { get; set; }

    @AuraEnabled
    public String dateKey { get; set; }

    @AuraEnabled
    public String timeLabel { get; set; }

    public FacilityCalendarEvent(
        Id eventId,
        String eventSubject,
        String eventDateKey,
        String eventTimeLabel
    ) {
        id = eventId;
        subject = eventSubject;
        dateKey = eventDateKey;
        timeLabel = eventTimeLabel;
    }
}
