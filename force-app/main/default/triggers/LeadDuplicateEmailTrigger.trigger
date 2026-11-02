trigger LeadDuplicateEmailTrigger on Lead (before insert) {
    LeadDuplicateEmailHandler.preventDuplicates(Trigger.new);
}
