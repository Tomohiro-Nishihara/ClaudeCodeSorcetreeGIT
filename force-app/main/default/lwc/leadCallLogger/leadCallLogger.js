import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import logCall from '@salesforce/apex/LeadCallLoggerController.logCall';
import getCallResultOptions from '@salesforce/apex/LeadCallLoggerController.getCallResultOptions';
import getHistory from '@salesforce/apex/LeadCallLoggerController.getHistory';

import LEAD_NAME from '@salesforce/schema/Lead.Name';
import LEAD_COMPANY from '@salesforce/schema/Lead.Company';
import LEAD_PHONE from '@salesforce/schema/Lead.Phone';
import LEAD_STATUS from '@salesforce/schema/Lead.Status';

const FIELDS = [LEAD_NAME, LEAD_COMPANY, LEAD_PHONE, LEAD_STATUS];

export default class LeadCallLogger extends LightningElement {
    @api recordId;

    callResult = '';
    memo = '';
    nextCallDate = '';
    isSaving = false;

    lead;
    historyResult; // refreshApex 用に wire の戻り値を保持する
    history = [];
    resultOptions = [];

    // ---------- リード情報(LDS) ----------
    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredLead({ data, error }) {
        if (data) {
            this.lead = data;
        } else if (error) {
            this.showToast('取得に失敗しました', this.reduceError(error), 'error');
        }
    }

    @wire(getCallResultOptions)
    wiredCallResultValues({ data, error }) {
        if (data) {
            this.resultOptions = data;
        } else if (error) {
            this.showToast('架電結果を取得できません', this.reduceError(error), 'error');
        }
    }

    get leadName() {
        return getFieldValue(this.lead, LEAD_NAME);
    }
    get company() {
        return getFieldValue(this.lead, LEAD_COMPANY);
    }
    get phone() {
        return getFieldValue(this.lead, LEAD_PHONE);
    }
    get status() {
        return getFieldValue(this.lead, LEAD_STATUS);
    }
    get telHref() {
        return this.phone ? `tel:${this.phone}` : undefined;
    }

    // ---------- 履歴(Apex) ----------
    @wire(getHistory, { leadId: '$recordId' })
    wiredHistory(result) {
        this.historyResult = result;
        const { data, error } = result;
        if (data) {
            this.history = data.map((t) => ({
                ...t,
                OwnerName: t.Owner ? t.Owner.Name : ''
            }));
        } else if (error) {
            this.showToast('履歴の取得に失敗しました', this.reduceError(error), 'error');
        }
    }

    get hasHistory() {
        return this.history.length > 0;
    }

    // ---------- 入力ハンドラ ----------
    handleResultChange(event) {
        this.callResult = event.detail.value;
    }
    handleMemoChange(event) {
        this.memo = event.target.value;
    }
    handleDateChange(event) {
        this.nextCallDate = event.target.value;
    }

    // ---------- バリデーション ----------
    validate() {
        const combo = this.template.querySelector('lightning-combobox');
        const dateInput = this.template.querySelector('lightning-input[type="date"]');

        // 架電結果:必須
        let valid = combo.reportValidity();

        // 次回架電日:過去日は不可(YYYY-MM-DD の文字列比較で判定)
        dateInput.setCustomValidity('');
        if (this.nextCallDate && this.nextCallDate < this.todayString()) {
            dateInput.setCustomValidity('次回架電日は今日以降の日付を指定してください。');
            valid = false;
        }
        dateInput.reportValidity();

        return valid;
    }

    todayString() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    }

    // ---------- 保存 ----------
    async handleSave() {
        if (!this.validate()) {
            return;
        }
        this.isSaving = true;
        try {
            await logCall({
                leadId: this.recordId,
                callResult: this.callResult, // Apex の引数名と一致させる
                memo: this.memo,
                nextCallDate: this.nextCallDate || null
            });

            // 履歴とリードの表示を、リロードなしで更新する
            await Promise.all([
                refreshApex(this.historyResult),
                notifyRecordUpdateAvailable([{ recordId: this.recordId }])
            ]);

            this.showToast('記録しました', '架電結果を保存しました。', 'success');
            this.resetForm();
        } catch (error) {
            this.showToast('記録できませんでした', this.reduceError(error), 'error');
        } finally {
            this.isSaving = false;
        }
    }

    resetForm() {
        this.callResult = '';
        this.memo = '';
        this.nextCallDate = '';
        // 必須エラー表示が残らないように、入力欄の状態をクリアする
        const combo = this.template.querySelector('lightning-combobox');
        if (combo) {
            combo.setCustomValidity('');
        }
    }

    // ---------- 共通 ----------
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    reduceError(error) {
        if (Array.isArray(error?.body)) {
            return error.body.map((e) => e.message).join(', ');
        }
        return error?.body?.message || error?.message || '不明なエラーが発生しました。';
    }
}