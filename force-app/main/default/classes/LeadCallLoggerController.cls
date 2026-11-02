public with sharing class LeadCallLoggerController {

    // ※ org のリード状況の選択リスト値に合わせて変更してください
    private static final String STATUS_QUALIFIED = 'Qualified';
    private static final String STATUS_UNQUALIFIED = 'Unqualified';
    private static final String STATUS_NOT_CONTACTED = 'Open - Not Contacted';
    private static final String STATUS_WORKING = 'Working - Contacted';

    private static final String SUBJECT_PREFIX = '【架電】';
    private static final String SUBJECT_NEXT_PREFIX = '【次回架電】';

    @AuraEnabled(cacheable=true)
    public static List<CallResultOption> getCallResultOptions() {
        List<CallResultOption> options = new List<CallResultOption>();
        for (Schema.PicklistEntry entry : Call_Log__c.Call_Result__c.getDescribe().getPicklistValues()) {
            if (entry.isActive()) {
                options.add(new CallResultOption(entry.getLabel(), entry.getValue()));
            }
        }
        return options;
    }

    /**
     * 架電記録とTask作成、Lead更新は1トランザクション。
     * どこかで例外が出れば、すべてロールバックされる。
     */
    @AuraEnabled
    public static void logCall(
        Id leadId,
        String callResult,
        String memo,
        Date nextCallDate
    ) {
        if (leadId == null || leadId.getSObjectType() != Lead.SObjectType) {
            throw new AuraHandledException('対象のリードを特定できません。');
        }
        if (!isValidCallResult(callResult)) {
            throw new AuraHandledException('有効な架電結果を選択してください。');
        }
        if (nextCallDate != null && nextCallDate < Date.today()) {
            throw new AuraHandledException('次回架電日は今日以降の日付を指定してください。');
        }

        try {
            List<Lead> leads = [
                SELECT Id, Status
                FROM Lead
                WHERE Id = :leadId
                WITH USER_MODE
                LIMIT 1
            ];
            if (leads.isEmpty()) {
                throw new AuraHandledException('リードが見つからないか、権限がありません。');
            }
            Lead lead = leads[0];

            Call_Log__c callLog = new Call_Log__c(
                Lead__c = leadId,
                Call_Result__c = callResult,
                Memo__c = memo
            );
            insert as user callLog;

            List<Task> tasks = new List<Task>();

            // 1. 完了済みの架電 Task
            tasks.add(new Task(
                WhoId = leadId,
                Subject = SUBJECT_PREFIX + callResult,
                Description = memo,
                Status = 'Completed',
                ActivityDate = Date.today()
            ));

            // 2. 次回架電日があれば、未完了の Task
            if (nextCallDate != null) {
                tasks.add(new Task(
                    WhoId = leadId,
                    Subject = SUBJECT_NEXT_PREFIX + callResult + ' の再架電',
                    Status = 'Not Started',
                    ActivityDate = nextCallDate
                ));
            }

            insert as user tasks;

            // 3. リード状況の更新
            String newStatus = resolveStatus(callResult, lead.Status);
            if (newStatus != null && newStatus != lead.Status) {
                lead.Status = newStatus;
                update as user lead;
            }
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            AuraHandledException handledError = new AuraHandledException(
                '保存に失敗しました: ' + e.getMessage()
            );
            handledError.setMessage('保存に失敗しました: ' + e.getMessage());
            throw handledError;
        }
    }

    private static Boolean isValidCallResult(String callResult) {
        if (String.isBlank(callResult)) {
            return false;
        }
        for (Schema.PicklistEntry option : Call_Log__c.Call_Result__c.getDescribe().getPicklistValues()) {
            if (option.isActive() && option.getValue() == callResult) {
                return true;
            }
        }
        return false;
    }

    /**
     * 直近の【架電】Task を新しい順に最大5件返す。
     */
    @AuraEnabled(cacheable=true)
    public static List<Task> getHistory(Id leadId) {
        if (leadId == null) {
            return new List<Task>();
        }
        String likeKey = SUBJECT_PREFIX + '%';
        return [
            SELECT Id, Subject, Description, ActivityDate, Status, CreatedDate, Owner.Name
            FROM Task
            WHERE WhoId = :leadId AND Subject LIKE :likeKey
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 5
        ];
    }

    
    @TestVisible
    private static String resolveStatus(String callResult, String currentStatus) {
        if (callResult == 'アポ獲得') {
            return STATUS_QUALIFIED;
        }
        if (callResult == '見込みなし') {
            return STATUS_UNQUALIFIED;
        }
        if (currentStatus == STATUS_NOT_CONTACTED) {
            return STATUS_WORKING;
        }
        return currentStatus;
    }
}