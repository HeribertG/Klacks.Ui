// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zum Übersetzen und Zuweisen aller statischen DomainMessages-Konstanten.
 * @param translateService - ngx-translate Service für i18n-Übersetzungen
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { DomainMessages } from 'src/app/domain/constants/messages';

const TRANSLATION_KEYS: string[] = [
  'UPDATE_NOT_DONE',
  'CANCEL_NOT_DONE',
  'ZIP_NOT_VALID',
  'DISABLE_POPUP_BLOCKER',
  'PLEASE_BE_PATIENT_EXCEL',
  'UNKNOWN_ERROR',
  'HTTP204',
  'HTTP400',
  'HTTP401',
  'HTTP403',
  'HTTP404',
  'AUTH_USER_NOT_EXIST',
  'AUTH_USER_ERROR',
  'RESPONSE_ERROR',
  'SUCCESS_STORAGE',
  'NEW_ENTRY',
  'NOT_DEFINED',
  'NOT_REGISTER_UPERCASECHARACTER',
  'NOT_REGISTER_ALPHANUMERICCHARACTER',
  'NOT_REGISTER',
  'REGISTER',
  'REGISTER_CHANGE_PASSWORD',
  'REGISTER_SEND_PASSWORD',
  'REGISTER_SEND_PASSWORD_ERROR',
  'REGISTER_CHANGE_PASSWORD_HEADER',
  'DELETE_ENTRY',
  'DEACTIVE_ADDRESS',
  'REACTIVE_ADDRESS',
  'REACTIVE_ADDRESS_TITLE',
  'PASSWORD_STRENGTH_SHORT',
  'PASSWORD_STRENGTH_WEAK',
  'PASSWORD_STRENGTH_COMMON',
  'PASSWORD_STRENGTH_STRONG',
  'ADDRES_TYPE0_NAME',
  'ADDRES_TYPE1_NAME',
  'ADDRES_TYPE2_NAME',
  'ADDRES_TYPE_UNDEFINED',
  'ERROR_LOADFILE_HTTP500',
  'ERROR_LOADIMAGE_HTTP500',
  'ERROR_DATE',
  'ENTITY_TYPE_ALL',
  'CLIENTLIST_ERROR_500',
  'NEW_ADDRESS',
  'VALID_FROM',
  'ABSENCE',
  'ALL_SCHEDULE',
  'ALL_GROUP',
  'ALL_SHIFT',
  'ALL_EMPLOYEE',
  'STATISTIC',
  'NOTE_NEW',
  'LAST_STATE',
  'EDITED_FROM',
  'COPY',
  'PASTE',
  'CUT',
  'DELETE',
  'CONVERT',
  'REGISTERUSER_MAILTEXT',
  'CHANGEPASSWORD_MAILTEXT',
  'REGISTERUSER_TITLE',
  'CHANGEPASSWORD_TITLE',
  'CHANGEPASSWORDUSER_MAILTEXT',
  'ERROR_TOASTTITLE',
  'SHIFT_SPORADIC_WEEK',
  'SHIFT_SPORADIC_MONTH',
  'SHIFT_SPORADIC_YEAR',
  'SHIFT_SPORADIC_QUARTER',
  'SHIFT_SPORADIC_SEMESTER',
  'SHIFT_SPORADIC_CONTRACTUALTERM',
  'DELETE_BREAK_PLACEHOLDER',
  'ADOPT_ABSENCE',
  'INBOX',
];

const KEY_TO_PROPERTY_OVERRIDES: Record<string, string> = {
  CLIENT_DOUBLETTE: 'CLIENT_DOUBLETS',
};

@Injectable({
  providedIn: 'root',
})
export class TranslateStringConstantsService {
  private translateService = inject(TranslateService);

  public translate(): void {
    const allKeys = [...TRANSLATION_KEYS, ...Object.keys(KEY_TO_PROPERTY_OVERRIDES)];

    const observables = allKeys.map(key => this.translateService.get(key));

    forkJoin(observables).subscribe(values => {
      allKeys.forEach((key, index) => {
        const property = KEY_TO_PROPERTY_OVERRIDES[key] ?? key;
        (DomainMessages as unknown as Record<string, string>)[property] = values[index];
      });
    });
  }
}
