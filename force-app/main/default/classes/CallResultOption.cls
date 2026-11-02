public class CallResultOption {
    @AuraEnabled
    public String label { get; set; }

    @AuraEnabled
    public String value { get; set; }

    public CallResultOption(String label, String value) {
        this.label = label;
        this.value = value;
    }
}
