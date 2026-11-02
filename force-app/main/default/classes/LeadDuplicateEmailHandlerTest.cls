@IsTest
private class LeadDuplicateEmailHandlerTest {
    @IsTest
    static void blocksEmailThatAlreadyExistsAndAllowsOtherEmails() {
        insert new Lead(
            LastName = '既存',
            Company = 'テスト会社',
            Email = 'test@test.com'
        );

        List<Lead> leads = new List<Lead>{
            new Lead(
                LastName = '重複',
                Company = 'テスト会社',
                Email = 'TEST@test.com'
            ),
            new Lead(
                LastName = '新規',
                Company = 'テスト会社',
                Email = 'new@test.com'
            ),
            new Lead(LastName = 'メールなし', Company = 'テスト会社')
        };

        Test.startTest();
        Database.SaveResult[] results = Database.insert(leads, false);
        Test.stopTest();

        System.assertEquals(false, results[0].isSuccess());
        System.assertEquals(
            '同じメールアドレスのリードが存在します',
            results[0].getErrors()[0].getMessage()
        );
        System.assertEquals(true, results[1].isSuccess());
        System.assertEquals(true, results[2].isSuccess());
    }

    @IsTest
    static void blocksLaterDuplicateInTheSameBulkInsert() {
        List<Lead> leads = new List<Lead>{
            new Lead(
                LastName = '一件目',
                Company = 'テスト会社',
                Email = 'same@test.com'
            ),
            new Lead(
                LastName = '二件目',
                Company = 'テスト会社',
                Email = 'SAME@test.com'
            )
        };

        Test.startTest();
        Database.SaveResult[] results = Database.insert(leads, false);
        Test.stopTest();

        System.assertEquals(true, results[0].isSuccess());
        System.assertEquals(false, results[1].isSuccess());
        System.assertEquals(
            '同じメールアドレスのリードが存在します',
            results[1].getErrors()[0].getMessage()
        );
    }

    @IsTest
    static void insertsLeadsWithNoEmailWithoutQueryingForDuplicates() {
        List<Lead> leads = new List<Lead>{
            new Lead(LastName = '一件目', Company = 'テスト会社'),
            new Lead(LastName = '二件目', Company = 'テスト会社')
        };

        Integer queriesBeforeInsert = Limits.getQueries();
        insert leads;
        Integer queriesUsed = Limits.getQueries() - queriesBeforeInsert;

        System.assertEquals(0, queriesUsed);
    }
}
