public class LeadDuplicateEmailHandler {
    private static final String DUPLICATE_EMAIL_ERROR =
        '同じメールアドレスのリードが存在します';

    public static void preventDuplicates(List<Lead> newLeads) {
        Set<String> emailsToCheck = new Set<String>();
        for (Lead newLead : newLeads) {
            if (!String.isBlank(newLead.Email)) {
                emailsToCheck.add(newLead.Email);
            }
        }

        Set<String> existingEmails = new Set<String>();
        if (!emailsToCheck.isEmpty()) {
            for (Lead existingLead : [
                SELECT Email
                FROM Lead
                WHERE Email IN :emailsToCheck
            ]) {
                existingEmails.add(normalizeEmail(existingLead.Email));
            }
        }

        Set<String> emailsInBatch = new Set<String>();
        for (Lead newLead : newLeads) {
            if (String.isBlank(newLead.Email)) {
                continue;
            }

            String normalizedEmail = normalizeEmail(newLead.Email);
            if (
                existingEmails.contains(normalizedEmail) ||
                emailsInBatch.contains(normalizedEmail)
            ) {
                newLead.Email.addError(DUPLICATE_EMAIL_ERROR);
            } else {
                emailsInBatch.add(normalizedEmail);
            }
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
