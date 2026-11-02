@IsTest
private class LeadCallLoggerControllerTest {
    @TestSetup
    static void assignLoggerPermissions() {
        PermissionSet loggerPermissions = [
            SELECT Id
            FROM PermissionSet
            WHERE Name = 'LeadCallLoggerAccess'
            LIMIT 1
        ];
        insert new PermissionSetAssignment(
            AssigneeId = UserInfo.getUserId(),
            PermissionSetId = loggerPermissions.Id
        );
    }

    @IsTest
    static void returnsCallResultPicklistOptions() {
        List<CallResultOption> options = LeadCallLoggerController.getCallResultOptions();

        System.assertEquals(5, options.size());
        System.assertEquals('不在', options[0].value);
        System.assertEquals('不在', options[0].label);

        CallResultOption option = new CallResultOption('テスト', 'テスト');
        System.assertEquals('テスト', option.label);
        System.assertEquals('テスト', option.value);
    }

    @IsTest
    static void logsCallUpdatesLeadAndCreatesFollowUpTask() {
        Lead leadRecord = new Lead(
            LastName = '架電テスト',
            Company = 'テスト会社',
            Status = 'Open - Not Contacted'
        );
        insert leadRecord;

        Date followUpDate = Date.today().addDays(3);

        Test.startTest();
        logCallAsAssignedUser(
            leadRecord.Id,
            'アポ獲得',
            '来週訪問予定',
            followUpDate
        );
        Test.stopTest();

        Lead updatedLead = [SELECT Status FROM Lead WHERE Id = :leadRecord.Id];
        System.assertEquals('Qualified', updatedLead.Status);

        List<Call_Log__c> callLogs = [
            SELECT Id
            FROM Call_Log__c
        ];
        System.assertEquals(1, callLogs.size());

        List<Task> tasks = [
            SELECT Subject, WhoId, Description, Status, ActivityDate
            FROM Task
            WHERE WhoId = :leadRecord.Id
        ];
        System.assertEquals(2, tasks.size());

        Integer completedTasks = 0;
        Integer followUpTasks = 0;
        for (Task taskRecord : tasks) {
            if (taskRecord.Status == 'Completed') {
                System.assertEquals('【架電】アポ獲得', taskRecord.Subject);
                System.assertEquals('来週訪問予定', taskRecord.Description);
                completedTasks++;
            } else {
                System.assertEquals('Not Started', taskRecord.Status);
                System.assertEquals('【次回架電】アポ獲得 の再架電', taskRecord.Subject);
                System.assertEquals(followUpDate, taskRecord.ActivityDate);
                followUpTasks++;
            }
        }
        System.assertEquals(1, completedTasks);
        System.assertEquals(1, followUpTasks);

        List<Task> history = LeadCallLoggerController.getHistory(leadRecord.Id);
        System.assertEquals(1, history.size());
        System.assertEquals('【架電】アポ獲得', history[0].Subject);
        System.assertEquals(0, LeadCallLoggerController.getHistory(null).size());
    }

    @IsTest
    static void marksOpenLeadContactedAndPreservesOtherStatuses() {
        Lead openLead = new Lead(
            LastName = '未架電',
            Company = 'テスト会社',
            Status = 'Open - Not Contacted'
        );
        Lead qualifiedLead = new Lead(
            LastName = '商談中',
            Company = 'テスト会社',
            Status = 'Qualified'
        );
        Lead disqualifiedLead = new Lead(
            LastName = '見込みなし',
            Company = 'テスト会社',
            Status = 'Open - Not Contacted'
        );
        insert new List<Lead>{ openLead, qualifiedLead, disqualifiedLead };

        Test.startTest();
        logCallAsAssignedUser(openLead.Id, '不在', null, null);
        logCallAsAssignedUser(qualifiedLead.Id, '折返し依頼', null, null);
        logCallAsAssignedUser(
            disqualifiedLead.Id,
            '見込みなし',
            null,
            null
        );
        Test.stopTest();

        Set<Id> leadIds = new Set<Id>{
            openLead.Id,
            qualifiedLead.Id,
            disqualifiedLead.Id
        };
        Map<Id, Lead> updatedLeads = new Map<Id, Lead>([
            SELECT Id, Status
            FROM Lead
            WHERE Id IN :leadIds
        ]);
        System.assertEquals('Working - Contacted', updatedLeads.get(openLead.Id).Status);
        System.assertEquals('Qualified', updatedLeads.get(qualifiedLead.Id).Status);
        System.assertEquals('Unqualified', updatedLeads.get(disqualifiedLead.Id).Status);

        List<Task> tasks = [
            SELECT Status
            FROM Task
            WHERE WhoId IN :leadIds
        ];
        System.assertEquals(3, tasks.size());
        for (Task taskRecord : tasks) {
            System.assertEquals('Completed', taskRecord.Status);
        }
    }

    private static void logCallAsAssignedUser(
        Id leadId,
        String callResult,
        String memo,
        Date nextCallDate
    ) {
        User testUser = [SELECT Id FROM User WHERE Id = :UserInfo.getUserId()];
        System.runAs(testUser) {
            LeadCallLoggerController.logCall(leadId, callResult, memo, nextCallDate);
        }
    }
}
