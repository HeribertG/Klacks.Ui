import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageLibrary } from '../helpers/string-constants';

@Injectable({
  providedIn: 'root',
})
export class TranslateStringConstantsService {
  constructor(private translateService: TranslateService) {}

  public translate() {
    this.translateService.get('UPDATE_NOT_DONE').subscribe((x: any) => {
      MessageLibrary.UPDATE_NOT_DONE = x;
    });
    this.translateService.get('CANCEL_NOT_DONE').subscribe((x: any) => {
      MessageLibrary.CANCEL_NOT_DONE = x;
    });
    this.translateService.get('ZIP_NOT_VALID').subscribe((x: any) => {
      MessageLibrary.ZIP_NOT_VALID = x;
    });
    this.translateService.get('DISABLE_POPUP_BLOCKER').subscribe((x: any) => {
      MessageLibrary.DISABLE_POPUP_BLOCKER = x;
    });
    this.translateService.get('PLEASE_BE_PATIENT_EXCEL').subscribe((x: any) => {
      MessageLibrary.PLEASE_BE_PATIENT_EXCEL = x;
    });
    this.translateService.get('UNKNOWN_ERROR').subscribe((x: any) => {
      MessageLibrary.UNKNOWN_ERROR = x;
    });
    this.translateService.get('HTTP204').subscribe((x: any) => {
      MessageLibrary.HTTP204 = x;
    });
    this.translateService.get('HTTP400').subscribe((x: any) => {
      MessageLibrary.HTTP400 = x;
    });
    this.translateService.get('HTTP401').subscribe((x: any) => {
      MessageLibrary.HTTP401 = x;
    });
    this.translateService.get('HTTP403').subscribe((x: any) => {
      MessageLibrary.HTTP403 = x;
    });
    this.translateService.get('HTTP404').subscribe((x: any) => {
      MessageLibrary.HTTP404 = x;
    });
    this.translateService.get('AUTH_USER_NOT_EXIST').subscribe((x: any) => {
      MessageLibrary.AUTH_USER_NOT_EXIST = x;
    });
    this.translateService.get('AUTH_USER_ERROR').subscribe((x: any) => {
      MessageLibrary.AUTH_USER_ERROR = x;
    });
    this.translateService.get('RESPONSE_ERROR').subscribe((x: any) => {
      MessageLibrary.RESPONSE_ERROR = x;
    });
    this.translateService.get('SUCCESS_STORAGE').subscribe((x: any) => {
      MessageLibrary.SUCCESS_STORAGE = x;
    });
    this.translateService.get('NEW_ENTRY').subscribe((x: any) => {
      MessageLibrary.NEW_ENTRY = x;
    });
    this.translateService.get('NOT_DEFINED').subscribe((x: any) => {
      MessageLibrary.NOT_DEFINED = x;
    });
    this.translateService
      .get('NOT_REGISTER_UPERCASECHARACTER')
      .subscribe((x: any) => {
        MessageLibrary.NOT_REGISTER_UPERCASECHARACTER = x;
      });
    this.translateService
      .get('NOT_REGISTER_ALPHANUMERICCHARACTER')
      .subscribe((x: any) => {
        MessageLibrary.NOT_REGISTER_ALPHANUMERICCHARACTER = x;
      });
    this.translateService.get('NOT_REGISTER').subscribe((x: any) => {
      MessageLibrary.NOT_REGISTER = x;
    });
    this.translateService.get('REGISTER').subscribe((x: any) => {
      MessageLibrary.REGISTER = x;
    });
    this.translateService
      .get('REGISTER_CHANGE_PASSWORD')
      .subscribe((x: any) => {
        MessageLibrary.REGISTER_CHANGE_PASSWORD = x;
      });
    this.translateService.get('REGISTER_SEND_PASSWORD').subscribe((x: any) => {
      MessageLibrary.REGISTER_SEND_PASSWORD = x;
    });
    this.translateService
      .get('REGISTER_SEND_PASSWORD_ERROR')
      .subscribe((x: any) => {
        MessageLibrary.REGISTER_SEND_PASSWORD_ERROR = x;
      });
    this.translateService
      .get('REGISTER_CHANGE_PASSWORD_HEADER')
      .subscribe((x: any) => {
        MessageLibrary.REGISTER_CHANGE_PASSWORD_HEADER = x;
      });
    this.translateService.get('DELETE_ENTRY').subscribe((x: any) => {
      MessageLibrary.DELETE_ENTRY = x;
    });
    this.translateService.get('DEACTIVE_ADDRESS').subscribe((x: any) => {
      MessageLibrary.DEACTIVE_ADDRESS = x;
    });
    this.translateService.get('REACTIVE_ADDRESS').subscribe((x: any) => {
      MessageLibrary.REACTIVE_ADDRESS = x;
    });
    this.translateService.get('REACTIVE_ADDRESS_TITLE').subscribe((x: any) => {
      MessageLibrary.REACTIVE_ADDRESS_TITLE = x;
    });
    this.translateService.get('PASSWORD_STRENGTH_SHORT').subscribe((x: any) => {
      MessageLibrary.PASSWORD_STRENGTH_SHORT = x;
    });
    this.translateService.get('PASSWORD_STRENGTH_WEAK').subscribe((x: any) => {
      MessageLibrary.PASSWORD_STRENGTH_WEAK = x;
    });
    this.translateService
      .get('PASSWORD_STRENGTH_COMMON')
      .subscribe((x: any) => {
        MessageLibrary.PASSWORD_STRENGTH_COMMON = x;
      });
    this.translateService
      .get('PASSWORD_STRENGTH_STRONG')
      .subscribe((x: any) => {
        MessageLibrary.PASSWORD_STRENGTH_STRONG = x;
      });
    this.translateService.get('ADDRES_TYPE0_NAME').subscribe((x: any) => {
      MessageLibrary.ADDRES_TYPE0_NAME = x;
    });
    this.translateService.get('ADDRES_TYPE1_NAME').subscribe((x: any) => {
      MessageLibrary.ADDRES_TYPE1_NAME = x;
    });
    this.translateService.get('ADDRES_TYPE2_NAME').subscribe((x: any) => {
      MessageLibrary.ADDRES_TYPE2_NAME = x;
    });
    this.translateService.get('ADDRES_TYPE_UNDEFINED').subscribe((x: any) => {
      MessageLibrary.ADDRES_TYPE_UNDEFINED = x;
    });
    this.translateService.get('ERROR_LOADFILE_HTTP500').subscribe((x: any) => {
      MessageLibrary.ERROR_LOADFILE_HTTP500 = x;
    });
    this.translateService.get('ERROR_LOADIMAGE_HTTP500').subscribe((x: any) => {
      MessageLibrary.ERROR_LOADIMAGE_HTTP500 = x;
    });
    this.translateService.get('ERROR_DATE').subscribe((x: any) => {
      MessageLibrary.ERROR_DATE = x;
    });
    this.translateService.get('ENTITY_TYPE_ALL').subscribe((x: any) => {
      MessageLibrary.ENTITY_TYPE_ALL = x;
    });
    this.translateService.get('CLIENTLIST_ERROR_500').subscribe((x: any) => {
      MessageLibrary.CLIENTLIST_ERROR_500 = x;
    });
    this.translateService.get('NEW_ADDRESS').subscribe((x: any) => {
      MessageLibrary.NEW_ADDRESS = x;
    });
    this.translateService.get('VALID_FROM').subscribe((x: any) => {
      MessageLibrary.VALID_FROM = x;
    });
    this.translateService.get('ABSENCE').subscribe((x: any) => {
      MessageLibrary.ABSENCE = x;
    });
    this.translateService.get('ALL_SCHEDULE').subscribe((x: any) => {
      MessageLibrary.ALL_SCHEDULE = x;
    });
    this.translateService.get('ALL_GROUP').subscribe((x: any) => {
      MessageLibrary.ALL_GROUP = x;
    });
    this.translateService.get('ALL_SHIFT').subscribe((x: any) => {
      MessageLibrary.ALL_SHIFT = x;
    });
    this.translateService.get('ALL_EMPLOYEE').subscribe((x: any) => {
      MessageLibrary.ALL_EMPLOYEE = x;
    });
    this.translateService.get('STATISTIC').subscribe((x: any) => {
      MessageLibrary.STATISTIC = x;
    });
    this.translateService.get('NOTE_NEW').subscribe((x: any) => {
      MessageLibrary.NOTE_NEW = x;
    });
    this.translateService.get('LAST_STATE').subscribe((x: any) => {
      MessageLibrary.LAST_STATE = x;
    });
    this.translateService.get('EDITED_FROM').subscribe((x: any) => {
      MessageLibrary.EDITED_FROM = x;
    });
    this.translateService.get('COPY').subscribe((x: any) => {
      MessageLibrary.COPY = x;
    });
    this.translateService.get('PASTE').subscribe((x: any) => {
      MessageLibrary.PASTE = x;
    });
    this.translateService.get('CUT').subscribe((x: any) => {
      MessageLibrary.CUT = x;
    });
    this.translateService.get('DELETE').subscribe((x: any) => {
      MessageLibrary.DELETE = x;
    });
    this.translateService.get('CONVERT').subscribe((x: any) => {
      MessageLibrary.CONVERT = x;
    });
    this.translateService.get('REGISTERUSER_MAILTEXT').subscribe((x: any) => {
      MessageLibrary.REGISTERUSER_MAILTEXT = x;
    });
    this.translateService.get('CHANGEPASSWORD_MAILTEXT').subscribe((x: any) => {
      MessageLibrary.CHANGEPASSWORD_MAILTEXT = x;
    });
    this.translateService.get('REGISTERUSER_TITLE').subscribe((x: any) => {
      MessageLibrary.REGISTERUSER_TITLE = x;
    });
    this.translateService.get('CHANGEPASSWORD_TITLE').subscribe((x: any) => {
      MessageLibrary.CHANGEPASSWORD_TITLE = x;
    });
    this.translateService
      .get('CHANGEPASSWORDUSER_MAILTEXT')
      .subscribe((x: any) => {
        MessageLibrary.CHANGEPASSWORDUSER_MAILTEXT = x;
      });
    this.translateService.get('CLIENT_DOUBLETTE').subscribe((x: any) => {
      MessageLibrary.CLIENT_DOUBLETS = x;
    });
    this.translateService.get('ERROR_TOASTTITLE').subscribe((x: any) => {
      MessageLibrary.ERROR_TOASTTITLE = x;
    });
  }
}
