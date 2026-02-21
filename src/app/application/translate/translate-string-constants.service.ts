import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Injectable({
  providedIn: 'root',
})
export class TranslateStringConstantsService {
  private translateService = inject(TranslateService);


  public translate() {
    this.translateService.get('UPDATE_NOT_DONE').subscribe((x: string) => {
      DomainMessages.UPDATE_NOT_DONE = x;
    });
    this.translateService.get('CANCEL_NOT_DONE').subscribe((x: string) => {
      DomainMessages.CANCEL_NOT_DONE = x;
    });
    this.translateService.get('ZIP_NOT_VALID').subscribe((x: string) => {
      DomainMessages.ZIP_NOT_VALID = x;
    });
    this.translateService
      .get('DISABLE_POPUP_BLOCKER')
      .subscribe((x: string) => {
        DomainMessages.DISABLE_POPUP_BLOCKER = x;
      });
    this.translateService
      .get('PLEASE_BE_PATIENT_EXCEL')
      .subscribe((x: string) => {
        DomainMessages.PLEASE_BE_PATIENT_EXCEL = x;
      });
    this.translateService.get('UNKNOWN_ERROR').subscribe((x: string) => {
      DomainMessages.UNKNOWN_ERROR = x;
    });
    this.translateService.get('HTTP204').subscribe((x: string) => {
      DomainMessages.HTTP204 = x;
    });
    this.translateService.get('HTTP400').subscribe((x: string) => {
      DomainMessages.HTTP400 = x;
    });
    this.translateService.get('HTTP401').subscribe((x: string) => {
      DomainMessages.HTTP401 = x;
    });
    this.translateService.get('HTTP403').subscribe((x: string) => {
      DomainMessages.HTTP403 = x;
    });
    this.translateService.get('HTTP404').subscribe((x: string) => {
      DomainMessages.HTTP404 = x;
    });
    this.translateService.get('AUTH_USER_NOT_EXIST').subscribe((x: string) => {
      DomainMessages.AUTH_USER_NOT_EXIST = x;
    });
    this.translateService.get('AUTH_USER_ERROR').subscribe((x: string) => {
      DomainMessages.AUTH_USER_ERROR = x;
    });
    this.translateService.get('RESPONSE_ERROR').subscribe((x: string) => {
      DomainMessages.RESPONSE_ERROR = x;
    });
    this.translateService.get('SUCCESS_STORAGE').subscribe((x: string) => {
      DomainMessages.SUCCESS_STORAGE = x;
    });
    this.translateService.get('NEW_ENTRY').subscribe((x: string) => {
      DomainMessages.NEW_ENTRY = x;
    });
    this.translateService.get('NOT_DEFINED').subscribe((x: string) => {
      DomainMessages.NOT_DEFINED = x;
    });
    this.translateService
      .get('NOT_REGISTER_UPERCASECHARACTER')
      .subscribe((x: string) => {
        DomainMessages.NOT_REGISTER_UPERCASECHARACTER = x;
      });
    this.translateService
      .get('NOT_REGISTER_ALPHANUMERICCHARACTER')
      .subscribe((x: string) => {
        DomainMessages.NOT_REGISTER_ALPHANUMERICCHARACTER = x;
      });
    this.translateService.get('NOT_REGISTER').subscribe((x: string) => {
      DomainMessages.NOT_REGISTER = x;
    });
    this.translateService.get('REGISTER').subscribe((x: string) => {
      DomainMessages.REGISTER = x;
    });
    this.translateService
      .get('REGISTER_CHANGE_PASSWORD')
      .subscribe((x: string) => {
        DomainMessages.REGISTER_CHANGE_PASSWORD = x;
      });
    this.translateService
      .get('REGISTER_SEND_PASSWORD')
      .subscribe((x: string) => {
        DomainMessages.REGISTER_SEND_PASSWORD = x;
      });
    this.translateService
      .get('REGISTER_SEND_PASSWORD_ERROR')
      .subscribe((x: string) => {
        DomainMessages.REGISTER_SEND_PASSWORD_ERROR = x;
      });
    this.translateService
      .get('REGISTER_CHANGE_PASSWORD_HEADER')
      .subscribe((x: string) => {
        DomainMessages.REGISTER_CHANGE_PASSWORD_HEADER = x;
      });
    this.translateService.get('DELETE_ENTRY').subscribe((x: string) => {
      DomainMessages.DELETE_ENTRY = x;
    });
    this.translateService.get('DEACTIVE_ADDRESS').subscribe((x: string) => {
      DomainMessages.DEACTIVE_ADDRESS = x;
    });
    this.translateService.get('REACTIVE_ADDRESS').subscribe((x: string) => {
      DomainMessages.REACTIVE_ADDRESS = x;
    });
    this.translateService
      .get('REACTIVE_ADDRESS_TITLE')
      .subscribe((x: string) => {
        DomainMessages.REACTIVE_ADDRESS_TITLE = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_SHORT')
      .subscribe((x: string) => {
        DomainMessages.PASSWORD_STRENGTH_SHORT = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_WEAK')
      .subscribe((x: string) => {
        DomainMessages.PASSWORD_STRENGTH_WEAK = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_COMMON')
      .subscribe((x: string) => {
        DomainMessages.PASSWORD_STRENGTH_COMMON = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_STRONG')
      .subscribe((x: string) => {
        DomainMessages.PASSWORD_STRENGTH_STRONG = x;
      });
    this.translateService.get('ADDRES_TYPE0_NAME').subscribe((x: string) => {
      DomainMessages.ADDRES_TYPE0_NAME = x;
    });
    this.translateService.get('ADDRES_TYPE1_NAME').subscribe((x: string) => {
      DomainMessages.ADDRES_TYPE1_NAME = x;
    });
    this.translateService.get('ADDRES_TYPE2_NAME').subscribe((x: string) => {
      DomainMessages.ADDRES_TYPE2_NAME = x;
    });
    this.translateService
      .get('ADDRES_TYPE_UNDEFINED')
      .subscribe((x: string) => {
        DomainMessages.ADDRES_TYPE_UNDEFINED = x;
      });
    this.translateService
      .get('ERROR_LOADFILE_HTTP500')
      .subscribe((x: string) => {
        DomainMessages.ERROR_LOADFILE_HTTP500 = x;
      });
    this.translateService
      .get('ERROR_LOADIMAGE_HTTP500')
      .subscribe((x: string) => {
        DomainMessages.ERROR_LOADIMAGE_HTTP500 = x;
      });
    this.translateService.get('ERROR_DATE').subscribe((x: string) => {
      DomainMessages.ERROR_DATE = x;
    });
    this.translateService.get('ENTITY_TYPE_ALL').subscribe((x: string) => {
      DomainMessages.ENTITY_TYPE_ALL = x;
    });
    this.translateService.get('CLIENTLIST_ERROR_500').subscribe((x: string) => {
      DomainMessages.CLIENTLIST_ERROR_500 = x;
    });
    this.translateService.get('NEW_ADDRESS').subscribe((x: string) => {
      DomainMessages.NEW_ADDRESS = x;
    });
    this.translateService.get('VALID_FROM').subscribe((x: string) => {
      DomainMessages.VALID_FROM = x;
    });
    this.translateService.get('ABSENCE').subscribe((x: string) => {
      DomainMessages.ABSENCE = x;
    });
    this.translateService.get('ALL_SCHEDULE').subscribe((x: string) => {
      DomainMessages.ALL_SCHEDULE = x;
    });
    this.translateService.get('ALL_GROUP').subscribe((x: string) => {
      DomainMessages.ALL_GROUP = x;
    });
    this.translateService.get('ALL_SHIFT').subscribe((x: string) => {
      DomainMessages.ALL_SHIFT = x;
    });
    this.translateService.get('ALL_EMPLOYEE').subscribe((x: string) => {
      DomainMessages.ALL_EMPLOYEE = x;
    });
    this.translateService.get('STATISTIC').subscribe((x: string) => {
      DomainMessages.STATISTIC = x;
    });
    this.translateService.get('NOTE_NEW').subscribe((x: string) => {
      DomainMessages.NOTE_NEW = x;
    });
    this.translateService.get('LAST_STATE').subscribe((x: string) => {
      DomainMessages.LAST_STATE = x;
    });
    this.translateService.get('EDITED_FROM').subscribe((x: string) => {
      DomainMessages.EDITED_FROM = x;
    });
    this.translateService.get('COPY').subscribe((x: string) => {
      DomainMessages.COPY = x;
    });
    this.translateService.get('PASTE').subscribe((x: string) => {
      DomainMessages.PASTE = x;
    });
    this.translateService.get('CUT').subscribe((x: string) => {
      DomainMessages.CUT = x;
    });
    this.translateService.get('DELETE').subscribe((x: string) => {
      DomainMessages.DELETE = x;
    });
    this.translateService.get('CONVERT').subscribe((x: string) => {
      DomainMessages.CONVERT = x;
    });
    this.translateService
      .get('REGISTERUSER_MAILTEXT')
      .subscribe((x: string) => {
        DomainMessages.REGISTERUSER_MAILTEXT = x;
      });
    this.translateService
      .get('CHANGEPASSWORD_MAILTEXT')
      .subscribe((x: string) => {
        DomainMessages.CHANGEPASSWORD_MAILTEXT = x;
      });
    this.translateService.get('REGISTERUSER_TITLE').subscribe((x: string) => {
      DomainMessages.REGISTERUSER_TITLE = x;
    });
    this.translateService.get('CHANGEPASSWORD_TITLE').subscribe((x: string) => {
      DomainMessages.CHANGEPASSWORD_TITLE = x;
    });
    this.translateService
      .get('CHANGEPASSWORDUSER_MAILTEXT')
      .subscribe((x: string) => {
        DomainMessages.CHANGEPASSWORDUSER_MAILTEXT = x;
      });
    this.translateService.get('CLIENT_DOUBLETTE').subscribe((x: string) => {
      DomainMessages.CLIENT_DOUBLETS = x;
    });
    this.translateService.get('ERROR_TOASTTITLE').subscribe((x: string) => {
      DomainMessages.ERROR_TOASTTITLE = x;
    });

    this.translateService.get('SHIFT_SPORADIC_WEEK').subscribe((x: string) => {
      DomainMessages.SHIFT_SPORADIC_WEEK = x;
    });
    this.translateService.get('SHIFT_SPORADIC_MONTH').subscribe((x: string) => {
      DomainMessages.SHIFT_SPORADIC_MONTH = x;
    });
    this.translateService.get('SHIFT_SPORADIC_YEAR').subscribe((x: string) => {
      DomainMessages.SHIFT_SPORADIC_YEAR = x;
    });
    this.translateService
      .get('SHIFT_SPORADIC_QUARTER')
      .subscribe((x: string) => {
        DomainMessages.SHIFT_SPORADIC_QUARTER = x;
      });
    this.translateService
      .get('SHIFT_SPORADIC_SEMESTER')
      .subscribe((x: string) => {
        DomainMessages.SHIFT_SPORADIC_SEMESTER = x;
      });
    this.translateService
      .get('SHIFT_SPORADIC_CONTRACTUALTERM')
      .subscribe((x: string) => {
        DomainMessages.SHIFT_SPORADIC_CONTRACTUALTERM = x;
      });
    this.translateService.get('DELETE_BREAK_PLACEHOLDER').subscribe((x: string) => {
      DomainMessages.DELETE_BREAK_PLACEHOLDER = x;
    });
    this.translateService.get('ADOPT_ABSENCE').subscribe((x: string) => {
      DomainMessages.ADOPT_ABSENCE = x;
    });
  }
}
