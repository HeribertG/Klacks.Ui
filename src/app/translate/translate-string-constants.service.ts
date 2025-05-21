import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageLibrary } from '../helpers/string-constants';

@Injectable({
  providedIn: 'root',
})
export class TranslateStringConstantsService {
  constructor(private translateService: TranslateService) {}

  public translate() {
    this.translateService.get('UPDATE_NOT_DONE').subscribe((x: string) => {
      MessageLibrary.UPDATE_NOT_DONE = x;
    });
    this.translateService.get('CANCEL_NOT_DONE').subscribe((x: string) => {
      MessageLibrary.CANCEL_NOT_DONE = x;
    });
    this.translateService.get('ZIP_NOT_VALID').subscribe((x: string) => {
      MessageLibrary.ZIP_NOT_VALID = x;
    });
    this.translateService
      .get('DISABLE_POPUP_BLOCKER')
      .subscribe((x: string) => {
        MessageLibrary.DISABLE_POPUP_BLOCKER = x;
      });
    this.translateService
      .get('PLEASE_BE_PATIENT_EXCEL')
      .subscribe((x: string) => {
        MessageLibrary.PLEASE_BE_PATIENT_EXCEL = x;
      });
    this.translateService.get('UNKNOWN_ERROR').subscribe((x: string) => {
      MessageLibrary.UNKNOWN_ERROR = x;
    });
    this.translateService.get('HTTP204').subscribe((x: string) => {
      MessageLibrary.HTTP204 = x;
    });
    this.translateService.get('HTTP400').subscribe((x: string) => {
      MessageLibrary.HTTP400 = x;
    });
    this.translateService.get('HTTP401').subscribe((x: string) => {
      MessageLibrary.HTTP401 = x;
    });
    this.translateService.get('HTTP403').subscribe((x: string) => {
      MessageLibrary.HTTP403 = x;
    });
    this.translateService.get('HTTP404').subscribe((x: string) => {
      MessageLibrary.HTTP404 = x;
    });
    this.translateService.get('AUTH_USER_NOT_EXIST').subscribe((x: string) => {
      MessageLibrary.AUTH_USER_NOT_EXIST = x;
    });
    this.translateService.get('AUTH_USER_ERROR').subscribe((x: string) => {
      MessageLibrary.AUTH_USER_ERROR = x;
    });
    this.translateService.get('RESPONSE_ERROR').subscribe((x: string) => {
      MessageLibrary.RESPONSE_ERROR = x;
    });
    this.translateService.get('SUCCESS_STORAGE').subscribe((x: string) => {
      MessageLibrary.SUCCESS_STORAGE = x;
    });
    this.translateService.get('NEW_ENTRY').subscribe((x: string) => {
      MessageLibrary.NEW_ENTRY = x;
    });
    this.translateService.get('NOT_DEFINED').subscribe((x: string) => {
      MessageLibrary.NOT_DEFINED = x;
    });
    this.translateService
      .get('NOT_REGISTER_UPERCASECHARACTER')
      .subscribe((x: string) => {
        MessageLibrary.NOT_REGISTER_UPERCASECHARACTER = x;
      });
    this.translateService
      .get('NOT_REGISTER_ALPHANUMERICCHARACTER')
      .subscribe((x: string) => {
        MessageLibrary.NOT_REGISTER_ALPHANUMERICCHARACTER = x;
      });
    this.translateService.get('NOT_REGISTER').subscribe((x: string) => {
      MessageLibrary.NOT_REGISTER = x;
    });
    this.translateService.get('REGISTER').subscribe((x: string) => {
      MessageLibrary.REGISTER = x;
    });
    this.translateService
      .get('REGISTER_CHANGE_PASSWORD')
      .subscribe((x: string) => {
        MessageLibrary.REGISTER_CHANGE_PASSWORD = x;
      });
    this.translateService
      .get('REGISTER_SEND_PASSWORD')
      .subscribe((x: string) => {
        MessageLibrary.REGISTER_SEND_PASSWORD = x;
      });
    this.translateService
      .get('REGISTER_SEND_PASSWORD_ERROR')
      .subscribe((x: string) => {
        MessageLibrary.REGISTER_SEND_PASSWORD_ERROR = x;
      });
    this.translateService
      .get('REGISTER_CHANGE_PASSWORD_HEADER')
      .subscribe((x: string) => {
        MessageLibrary.REGISTER_CHANGE_PASSWORD_HEADER = x;
      });
    this.translateService.get('DELETE_ENTRY').subscribe((x: string) => {
      MessageLibrary.DELETE_ENTRY = x;
    });
    this.translateService.get('DEACTIVE_ADDRESS').subscribe((x: string) => {
      MessageLibrary.DEACTIVE_ADDRESS = x;
    });
    this.translateService.get('REACTIVE_ADDRESS').subscribe((x: string) => {
      MessageLibrary.REACTIVE_ADDRESS = x;
    });
    this.translateService
      .get('REACTIVE_ADDRESS_TITLE')
      .subscribe((x: string) => {
        MessageLibrary.REACTIVE_ADDRESS_TITLE = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_SHORT')
      .subscribe((x: string) => {
        MessageLibrary.PASSWORD_STRENGTH_SHORT = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_WEAK')
      .subscribe((x: string) => {
        MessageLibrary.PASSWORD_STRENGTH_WEAK = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_COMMON')
      .subscribe((x: string) => {
        MessageLibrary.PASSWORD_STRENGTH_COMMON = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_STRONG')
      .subscribe((x: string) => {
        MessageLibrary.PASSWORD_STRENGTH_STRONG = x;
      });
    this.translateService.get('ADDRES_TYPE0_NAME').subscribe((x: string) => {
      MessageLibrary.ADDRES_TYPE0_NAME = x;
    });
    this.translateService.get('ADDRES_TYPE1_NAME').subscribe((x: string) => {
      MessageLibrary.ADDRES_TYPE1_NAME = x;
    });
    this.translateService.get('ADDRES_TYPE2_NAME').subscribe((x: string) => {
      MessageLibrary.ADDRES_TYPE2_NAME = x;
    });
    this.translateService
      .get('ADDRES_TYPE_UNDEFINED')
      .subscribe((x: string) => {
        MessageLibrary.ADDRES_TYPE_UNDEFINED = x;
      });
    this.translateService
      .get('ERROR_LOADFILE_HTTP500')
      .subscribe((x: string) => {
        MessageLibrary.ERROR_LOADFILE_HTTP500 = x;
      });
    this.translateService
      .get('ERROR_LOADIMAGE_HTTP500')
      .subscribe((x: string) => {
        MessageLibrary.ERROR_LOADIMAGE_HTTP500 = x;
      });
    this.translateService.get('ERROR_DATE').subscribe((x: string) => {
      MessageLibrary.ERROR_DATE = x;
    });
    this.translateService.get('ENTITY_TYPE_ALL').subscribe((x: string) => {
      MessageLibrary.ENTITY_TYPE_ALL = x;
    });
    this.translateService.get('CLIENTLIST_ERROR_500').subscribe((x: string) => {
      MessageLibrary.CLIENTLIST_ERROR_500 = x;
    });
    this.translateService.get('NEW_ADDRESS').subscribe((x: string) => {
      MessageLibrary.NEW_ADDRESS = x;
    });
    this.translateService.get('VALID_FROM').subscribe((x: string) => {
      MessageLibrary.VALID_FROM = x;
    });
    this.translateService.get('ABSENCE').subscribe((x: string) => {
      MessageLibrary.ABSENCE = x;
    });
    this.translateService.get('ALL_SCHEDULE').subscribe((x: string) => {
      MessageLibrary.ALL_SCHEDULE = x;
    });
    this.translateService.get('ALL_GROUP').subscribe((x: string) => {
      MessageLibrary.ALL_GROUP = x;
    });
    this.translateService.get('ALL_SHIFT').subscribe((x: string) => {
      MessageLibrary.ALL_SHIFT = x;
    });
    this.translateService.get('ALL_EMPLOYEE').subscribe((x: string) => {
      MessageLibrary.ALL_EMPLOYEE = x;
    });
    this.translateService.get('STATISTIC').subscribe((x: string) => {
      MessageLibrary.STATISTIC = x;
    });
    this.translateService.get('NOTE_NEW').subscribe((x: string) => {
      MessageLibrary.NOTE_NEW = x;
    });
    this.translateService.get('LAST_STATE').subscribe((x: string) => {
      MessageLibrary.LAST_STATE = x;
    });
    this.translateService.get('EDITED_FROM').subscribe((x: string) => {
      MessageLibrary.EDITED_FROM = x;
    });
    this.translateService.get('COPY').subscribe((x: string) => {
      MessageLibrary.COPY = x;
    });
    this.translateService.get('PASTE').subscribe((x: string) => {
      MessageLibrary.PASTE = x;
    });
    this.translateService.get('CUT').subscribe((x: string) => {
      MessageLibrary.CUT = x;
    });
    this.translateService.get('DELETE').subscribe((x: string) => {
      MessageLibrary.DELETE = x;
    });
    this.translateService.get('CONVERT').subscribe((x: string) => {
      MessageLibrary.CONVERT = x;
    });
    this.translateService
      .get('REGISTERUSER_MAILTEXT')
      .subscribe((x: string) => {
        MessageLibrary.REGISTERUSER_MAILTEXT = x;
      });
    this.translateService
      .get('CHANGEPASSWORD_MAILTEXT')
      .subscribe((x: string) => {
        MessageLibrary.CHANGEPASSWORD_MAILTEXT = x;
      });
    this.translateService.get('REGISTERUSER_TITLE').subscribe((x: string) => {
      MessageLibrary.REGISTERUSER_TITLE = x;
    });
    this.translateService.get('CHANGEPASSWORD_TITLE').subscribe((x: string) => {
      MessageLibrary.CHANGEPASSWORD_TITLE = x;
    });
    this.translateService
      .get('CHANGEPASSWORDUSER_MAILTEXT')
      .subscribe((x: string) => {
        MessageLibrary.CHANGEPASSWORDUSER_MAILTEXT = x;
      });
    this.translateService.get('CLIENT_DOUBLETTE').subscribe((x: string) => {
      MessageLibrary.CLIENT_DOUBLETS = x;
    });
    this.translateService.get('ERROR_TOASTTITLE').subscribe((x: string) => {
      MessageLibrary.ERROR_TOASTTITLE = x;
    });
  }
}
