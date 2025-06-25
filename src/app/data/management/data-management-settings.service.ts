/* eslint-disable no-dupe-else-if */
import { EffectRef, Injectable, effect, inject, signal } from '@angular/core';
import {
  cloneObject,
  compareComplexObjects,
} from '../../helpers/object-helpers';
import { MessageLibrary } from '../../helpers/string-constants';
import { ToastShowService } from '../../toast/toast-show.service';
import { UserAdministrationService } from '../user-administration.service';
import {
  IAuthentication,
  ChangePassword,
  ChangeRole,
} from '../../core/authentification-class';
import { DataSettingsVariousService } from '../data-settings-various.service';
import {
  ISetting,
  AppSetting,
  Setting,
} from 'src/app/core/settings-various-class';
import { ICountry, IState } from 'src/app/core/client-class';
import { DataCountryStateService } from '../data-country-state.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';
import { DataMacroService } from '../data-macro.service';
import { IMacro } from 'src/app/core/macro-class';
import { GridColorService } from 'src/app/shared/grid/services/grid-color.service';
import { MultiLanguage } from 'src/app/core/multi-language-class';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSettingsService {
  public userAdministrationService = inject(UserAdministrationService);
  public dataSettingsVariousService = inject(DataSettingsVariousService);
  public dataCountryStateService = inject(DataCountryStateService);
  public dataMacroService = inject(DataMacroService);
  public toastShowService = inject(ToastShowService);
  public gridColorService = inject(GridColorService);

  public isReset = signal(false);

  public accountsList: IAuthentication[] = [];
  public accountCount = 0;
  public CurrentAccountId = '';

  public countriesList: ICountry[] = new Array<ICountry>();
  public countriesListDummy: ICountry[] = new Array<ICountry>();
  public countriesListCount = 0;

  public statesList: IState[] = new Array<IState>();
  public statesListDummy: IState[] = new Array<IState>();
  public statesListCount = 0;

  public macroList: IMacro[] = [];
  public macroListDummy: IMacro[] = [];
  public macroListCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public originalMacroTypeList: any[] = [];

  public appName = '';
  public appAddressName = '';
  public appSupplementAddress = '';
  public appAddressAddress = '';
  public appAddressZip = '';
  public appAddressPlace = '';
  public appAddressPhone = '';
  public appAddressMail = '';
  public appAddressAccountingStart = 0;

  public outgoingServer = '';
  public outgoingServerPort = '';
  public enabledSSL = '';
  public outgoingServerTimeout = '';
  public authenticationType = '';
  public readReceipt = '';
  public replyTo = '';
  public dispositionNotification = '';
  public mark = '';
  public outgoingserverUsername = '';
  public outgoingserverPassword = '';
  public mailPriority = '';

  public appMandantNumber = '';
  public appBusinessArea = '';

  public appNameDummy = '';
  public appAddressNameDummy = '';
  public appSupplementAddressDummy = '';
  public appAddressAddressDummy = '';
  public appAddressZipDummy = '';
  public appAddressPlaceDummy = '';
  public appAddressPhoneDummy = '';
  public appAddressMailDummy = '';
  public appAddressAccountingStartDummy = 0;
  public markDummy = '';

  public outgoingServerDummy = '';
  public outgoingServerPortDummy = '';
  public enabledSSLDummy = '';
  public outgoingServerTimeoutDummy = '';
  public authenticationTypeDummy = '';
  public readReceiptDummy = '';
  public replyToDummy = '';
  public dispositionNotificationDummy = '';
  public outgoingserverUsernameDummy = '';
  public outgoingserverPasswordDummy = '';
  public mailPriorityDummy = '';

  public appMandantNumberDummy = '';
  public appBusinessAreaDummy = '';

  public bankDetailCount = 0;
  public isBankDetailRowFocusIndex = -1;

  public settingList: ISetting[] = [];
  public settingsCount = 0;

  public isDirty = false;

  private effectRef: EffectRef | null = null;

  constructor() {
    effect(() => {
      const isReset = this.gridColorService.isReset();
      if (isReset) {
        this.isReset.set(true);
        this.gridColorService.isReset.set(false);
      }
    });
  }

  /* #region  UserAdministration */

  readAccountsList() {
    this.userAdministrationService.readAccountsList().subscribe((x) => {
      if (x) {
        this.accountsList = x as IAuthentication[];
        this.accountsList.sort(compare);
        function compare(a: IAuthentication, b: IAuthentication) {
          const tmpa = a.lastName + ' ' + a.firstName;
          const tmpb = b.lastName + ' ' + b.firstName;
          return tmpa.localeCompare(tmpb);
        }
      }
    });
  }

  private countActionAccount(action: boolean) {
    if (action) {
      this.accountCount++;
    } else {
      this.accountCount--;
    }
    if (this.accountCount === 0) {
      setTimeout(() => {
        this.readAccountsList();
      }, 200);
    }
  }

  addAccount(value: IAuthentication) {
    this.userAdministrationService.addAccount(value).subscribe((x) => {
      if (!x.mailSuccess) {
        this.toastShowService.showError(
          MessageLibrary.UNKNOWN_ERROR,
          'SENDEMAIL'
        );
        console.error(MessageLibrary.UNKNOWN_ERROR, x.modelState);
      }
      this.toastShowService.showInfo(MessageLibrary.REGISTER, 'REGISTER');

      this.readAccountsList();
    });
  }

  deleteAccount(id: string) {
    this.userAdministrationService.deleteAccount(id).subscribe(() => {
      this.readAccountsList();
    });
  }

  saveAccountsRole() {
    this.accountCount = 0;

    this.accountsList.forEach((x) => {
      this.changeRoleAdmin(x);
      this.changeRoleAuthorised(x);
    });
  }

  private changeRoleAdmin(value: IAuthentication) {
    this.countActionAccount(true);
    const c = new ChangeRole();

    c.userId = value.id!;
    c.roleName = 'Admin';
    c.isSelected = value.isAdmin;

    this.userAdministrationService.changeRole(c).subscribe((x) => {
      if (x) {
        this.countActionAccount(false);
      }
    });
  }

  private changeRoleAuthorised(value: IAuthentication) {
    this.countActionAccount(true);
    const c = new ChangeRole();

    c.userId = value.id!;
    c.roleName = 'Authorised';
    c.isSelected = value.isAuthorised;

    this.userAdministrationService.changeRole(c).subscribe(() => {
      this.countActionAccount(false);
    });
  }

  sentPassword(value: ChangePassword) {
    this.userAdministrationService.ChangePassword(value).subscribe((x) => {
      if (x.success === true) {
        this.toastShowService.showInfo(
          MessageLibrary.REGISTER_SEND_PASSWORD,
          'REGISTER_SEND_PASSWORD'
        );
      } else {
        this.toastShowService.showInfo(
          MessageLibrary.REGISTER_SEND_PASSWORD_ERROR,
          'REGISTER_SEND_PASSWORD_ERROR'
        );
      }
    });
  }

  /* #endregion  UserAdministration */

  /* #region   various */

  private countSettings(action: boolean) {
    if (action) {
      this.settingsCount++;
    } else {
      this.settingsCount--;
    }
    if (this.settingsCount === 0) {
      this.readSettingList();
    }
  }

  readSettingList() {
    this.dataSettingsVariousService.readSettingList().subscribe((l) => {
      if (l) {
        this.settingList = l as ISetting[];
        this.resetSetting();
        this.settingList.forEach((x) => {
          if (x) {
            this.setSetting(x);
          }
        });
      }
      this.IfStorageIsSuccessful();
    });
  }

  readSettingList1() {
    return this.dataSettingsVariousService.readSettingList();
  }

  private resetSetting() {
    this.appName = '';
    this.appAddressName = '';
    this.appSupplementAddress = '';
    this.appAddressAddress = '';
    this.appAddressZip = '';
    this.appAddressPlace = '';
    this.appAddressPhone = '';
    this.appAddressMail = '';
    this.appAddressAccountingStart = 0;

    this.outgoingServer = '';
    this.outgoingServerPort = '';
    this.enabledSSL = '';
    this.outgoingServerTimeout = '';
    this.authenticationType = '';
    this.readReceipt = '';
    this.replyTo = '';
    this.dispositionNotification = '';
    this.mark = '';
    this.outgoingserverUsername = '';
    this.outgoingserverPassword = '';
    this.mailPriority = '';

    this.appNameDummy = '';
    this.appAddressNameDummy = '';
    this.appSupplementAddressDummy = '';
    this.appAddressAddressDummy = '';
    this.appAddressZipDummy = '';
    this.appAddressPlaceDummy = '';
    this.appAddressPhoneDummy = '';
    this.appAddressMailDummy = '';
    this.appAddressAccountingStartDummy = 0;

    this.outgoingServerDummy = '';
    this.outgoingServerPortDummy = '';
    this.enabledSSLDummy = '';
    this.outgoingServerTimeoutDummy = '';
    this.authenticationTypeDummy = '';
    this.readReceiptDummy = '';
    this.replyToDummy = '';
    this.dispositionNotificationDummy = '';
    this.markDummy = '';
    this.outgoingserverUsernameDummy = '';
    this.outgoingserverPasswordDummy = '';
    this.mailPriorityDummy = '';

    this.appMandantNumber = '';
    this.appBusinessArea = '';
  }

  private setSetting(value: ISetting) {
    switch (value.type) {
      case AppSetting.APP_NAME:
        this.appName = value.value;
        this.appNameDummy = value.value;
        break;
      case AppSetting.APP_ADDRESS_NAME:
        this.appAddressName = value.value;
        this.appAddressNameDummy = value.value;
        break;
      case AppSetting.APP_ADDRESS_SUPPLEMENT:
        this.appSupplementAddress = value.value;
        this.appSupplementAddressDummy = value.value;
        break;
      case AppSetting.APP_ADDRESS_ADDRESS:
        this.appAddressAddress = value.value;
        this.appAddressAddressDummy = value.value;
        break;
      case AppSetting.APP_ADDRESS_ZIP:
        this.appAddressZip = value.value;
        this.appAddressZipDummy = value.value;
        break;
      case AppSetting.APP_ADDRESS_PLACE:
        this.appAddressPlace = value.value;
        this.appAddressPlaceDummy = value.value;
        break;
      case AppSetting.APP_ADDRESS_PHONE:
        this.appAddressPhone = value.value;
        this.appAddressPhoneDummy = value.value;
        break;
      case AppSetting.APP_ADDRESS_MAIL:
        this.appAddressMail = value.value;
        this.appAddressMailDummy = value.value;
        break;
      case AppSetting.APP_ACCOUNTING_START:
        this.appAddressAccountingStart = +value.value;
        this.appAddressAccountingStartDummy = +value.value;
        break;

      case AppSetting.APP_ABACUS_CLIENT_NUMBER:
        this.appMandantNumber = value.value;
        this.appMandantNumberDummy = value.value;
        break;

      case AppSetting.APP_AUTHENTICATION_TYPE:
        this.authenticationType = value.value;
        this.authenticationTypeDummy = value.value;
        break;
      case AppSetting.APP_ENABLE_SSL:
        this.enabledSSL = value.value;
        this.enabledSSLDummy = value.value;
        break;

      case AppSetting.APP_REPLY_TO:
        this.replyTo = value.value;
        this.replyToDummy = value.value;
        break;

      case AppSetting.APP_DISPOSITION_NOTIFICATION:
        this.dispositionNotification = value.value;
        this.dispositionNotificationDummy = value.value;
        break;

      case AppSetting.APP_OUTGOING_SERVER:
        this.outgoingServer = value.value;
        this.outgoingServerDummy = value.value;
        break;

      case AppSetting.APP_OUTGOING_SERVER_TIMEOUT:
        this.outgoingServerTimeout = value.value;
        this.outgoingServerTimeoutDummy = value.value;
        break;
      case AppSetting.APP_OUTGOING_SERVER_PORT:
        this.outgoingServerPort = value.value;
        this.outgoingServerPortDummy = value.value;
        break;

      case AppSetting.APP_READ_RECEIPT:
        this.readReceipt = value.value;
        this.readReceiptDummy = value.value;
        break;

      case AppSetting.APP_MARK:
        this.mark = value.value;
        this.markDummy = value.value;
        break;

      case AppSetting.APP_OUTGOING_SERVER_USERNAME:
        this.outgoingserverUsername = value.value;
        this.outgoingserverUsernameDummy = value.value;
        break;

      case AppSetting.APP_OUTGOING_SERVER_PASSWORD:
        this.outgoingserverPassword = value.value;
        this.outgoingserverPasswordDummy = value.value;
        break;
    }
  }
  private saveSetting() {
    this.saveSetting_sub(this.appName, this.appNameDummy, AppSetting.APP_NAME);
    this.saveSetting_sub(
      this.appAddressName,
      this.appAddressNameDummy,
      AppSetting.APP_ADDRESS_NAME
    );
    this.saveSetting_sub(
      this.appSupplementAddress,
      this.appSupplementAddressDummy,
      AppSetting.APP_ADDRESS_SUPPLEMENT
    );
    this.saveSetting_sub(
      this.appAddressAddress,
      this.appAddressAddressDummy,
      AppSetting.APP_ADDRESS_ADDRESS
    );
    this.saveSetting_sub(
      this.appAddressZip,
      this.appAddressZipDummy,
      AppSetting.APP_ADDRESS_ZIP
    );
    this.saveSetting_sub(
      this.appAddressPlace,
      this.appAddressPlaceDummy,
      AppSetting.APP_ADDRESS_PLACE
    );
    this.saveSetting_sub(
      this.appAddressPhone,
      this.appAddressPhoneDummy,
      AppSetting.APP_ADDRESS_PHONE
    );
    this.saveSetting_sub(
      this.appAddressMail,
      this.appAddressMailDummy,
      AppSetting.APP_ADDRESS_MAIL
    );
    this.saveSetting_sub(
      this.appAddressAccountingStart.toString(),
      this.appAddressAccountingStartDummy.toString(),
      AppSetting.APP_ACCOUNTING_START
    );
    this.saveSetting_sub(
      this.appMandantNumber,
      this.appMandantNumberDummy,
      AppSetting.APP_ABACUS_CLIENT_NUMBER
    );
    this.saveSetting_sub(
      this.appBusinessArea,
      this.appBusinessAreaDummy,
      AppSetting.APP_ABACUS_BUSINESS_AREA
    );

    this.saveSetting_sub(
      this.outgoingServer,
      this.outgoingServerDummy,
      AppSetting.APP_OUTGOING_SERVER
    );
    this.saveSetting_sub(
      this.outgoingServerPort,
      this.outgoingServerPortDummy,
      AppSetting.APP_OUTGOING_SERVER_PORT
    );
    this.saveSetting_sub(
      this.enabledSSL,
      this.enabledSSLDummy,
      AppSetting.APP_ENABLE_SSL
    );
    this.saveSetting_sub(
      this.outgoingServerTimeout,
      this.outgoingServerTimeoutDummy,
      AppSetting.APP_OUTGOING_SERVER_TIMEOUT
    );
    this.saveSetting_sub(
      this.authenticationType,
      this.authenticationTypeDummy,
      AppSetting.APP_AUTHENTICATION_TYPE
    );
    this.saveSetting_sub(
      this.readReceipt,
      this.readReceiptDummy,
      AppSetting.APP_READ_RECEIPT
    );
    this.saveSetting_sub(
      this.replyTo,
      this.replyToDummy,
      AppSetting.APP_REPLY_TO
    );
    this.saveSetting_sub(
      this.dispositionNotification,
      this.dispositionNotificationDummy,
      AppSetting.APP_DISPOSITION_NOTIFICATION
    );

    this.saveSetting_sub(this.mark, this.markDummy, AppSetting.APP_MARK);
    this.saveSetting_sub(
      this.outgoingserverUsername,
      this.outgoingserverUsernameDummy,
      AppSetting.APP_OUTGOING_SERVER_USERNAME
    );
    this.saveSetting_sub(
      this.outgoingserverPassword,
      this.outgoingserverPasswordDummy,
      AppSetting.APP_OUTGOING_SERVER_PASSWORD
    );

    this.saveSetting_sub(this.mark, this.markDummy, AppSetting.APP_MARK);
  }

  private saveSetting_sub(value: string, dummy: string, type: string) {
    if (value !== dummy) {
      const c = this.settingList.find((x) => x.type === type);
      if (c) {
        this.countSettings(true);
        c.value = value;
        this.dataSettingsVariousService.updateSetting(c).subscribe(() => {
          this.countSettings(false);
        });
      } else {
        const nc = new Setting();
        nc.value = value;
        nc.type = type;
        this.countSettings(true);
        this.dataSettingsVariousService.addSetting(nc).subscribe(() => {
          this.countSettings(false);
        });
      }
    }
  }

  private isSetting_Dirty(): boolean {
    if (this.appName !== this.appNameDummy) {
      return true;
    }
    if (this.appAddressName !== this.appAddressNameDummy) {
      return true;
    }
    if (this.appSupplementAddress !== this.appSupplementAddressDummy) {
      return true;
    }
    if (this.appAddressAddress !== this.appAddressAddressDummy) {
      return true;
    }
    if (this.appAddressZip !== this.appAddressZipDummy) {
      return true;
    }
    if (this.appAddressPlace !== this.appAddressPlaceDummy) {
      return true;
    }
    if (this.appAddressPhone !== this.appAddressPhoneDummy) {
      return true;
    }
    if (this.appAddressMail !== this.appAddressMailDummy) {
      return true;
    }
    if (
      this.appAddressAccountingStart !== this.appAddressAccountingStartDummy
    ) {
      return true;
    }
    if (this.appMandantNumber !== this.appMandantNumberDummy) {
      return true;
    }
    if (this.appBusinessArea !== this.appBusinessAreaDummy) {
      return true;
    }

    if (this.outgoingServer !== this.outgoingServerDummy) {
      return true;
    }
    if (this.outgoingServerPort !== this.outgoingServerPortDummy) {
      return true;
    }
    if (this.enabledSSL !== this.enabledSSLDummy) {
      return true;
    }
    if (this.outgoingServerTimeout !== this.outgoingServerTimeoutDummy) {
      return true;
    }
    if (this.authenticationType !== this.authenticationTypeDummy) {
      return true;
    }
    if (this.readReceipt !== this.readReceiptDummy) {
      return true;
    }
    if (this.replyTo !== this.replyToDummy) {
      return true;
    }
    if (this.dispositionNotification !== this.dispositionNotificationDummy) {
      return true;
    }

    if (this.mark !== this.markDummy) {
      return true;
    }

    if (this.outgoingserverUsername !== this.outgoingserverUsernameDummy) {
      return true;
    }

    if (this.outgoingserverPassword !== this.outgoingserverPasswordDummy) {
      return true;
    }

    if (this.mailPriority !== this.mailPriorityDummy) {
      return true;
    }

    return false;
  }

  /* #endregion   various */

  /* #region   countries */

  readCountryList() {
    this.dataCountryStateService.getCountryList().subscribe((x) => {
      if (x) {
        this.countriesList = x as ICountry[];
        this.countriesListDummy = cloneObject<ICountry[]>(this.countriesList);
        this.isReset.set(true);
        setTimeout(() => this.isReset.set(false), 100);
      }
    });
  }

  private countActionCountry(action: boolean) {
    if (action) {
      this.countriesListCount++;
    } else {
      this.countriesListCount--;
    }
    if (this.countriesListCount === 0) {
      this.readCountryList();
      this.IfStorageIsSuccessful();
    }
  }

  private saveCountryList() {
    this.countriesList.forEach(async (x) => {
      if (
        this.emptyPlaceholder(x.name!) &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.rewrite
      ) {
        this.countActionCountry(true);
        this.dataCountryStateService.deleteCountry(x.id!).subscribe(() => {
          this.countActionCountry(false);
        });
      } else if (x.isDirty === 3) {
        this.countActionCountry(true);
        this.dataCountryStateService.deleteCountry(x.id!).subscribe(() => {
          this.countActionCountry(false);
        });
      } else if (
        !this.emptyPlaceholder(x.name!) &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.new
      ) {
        delete x.id;
        this.countActionCountry(true);
        this.dataCountryStateService.addCountry(x).subscribe(() => {
          this.countActionCountry(false);
        });
      } else if (
        this.emptyPlaceholder(x.name!) &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.rewrite
      ) {
        this.countActionCountry(true);
        this.dataCountryStateService.updateCountry(x).subscribe(() => {
          this.countActionCountry(false);
        });
      }
    });
  }

  private isCountryList_Dirty(): boolean {
    const listOfExcludedObject = ['isDirty'];

    const a = this.countriesList as ICountry[];
    const b = this.countriesListDummy as ICountry[];

    if (!compareComplexObjects(a, b, listOfExcludedObject)) {
      // Bei unfertigen Eingaben wird kein isDirty geworfen
      const tmp = this.countriesList.filter(
        (x) =>
          x.isDirty === CreateEntriesEnum.new &&
          (this.emptyPlaceholder(x.name!) ||
            x.abbreviation === '' ||
            x.prefix === '')
      );

      if (tmp && tmp.length !== 0) {
        return false;
      }
      return true;
    }
    return false;
  }

  /* #endregion   countries */

  /* #region   states*/

  readStateList() {
    this.dataCountryStateService.GetStateList().subscribe((x: IState[]) => {
      if (x) {
        this.statesList = x as IState[];
        this.statesListDummy = cloneObject<IState[]>(this.statesList);
        this.isReset.set(true);
        setTimeout(() => this.isReset.set(false), 100);
      }
    });
  }

  private countActionState(action: boolean) {
    if (action) {
      this.statesListCount++;
    } else {
      this.statesListCount--;
    }
    if (this.countriesListCount === 0) {
      this.readStateList();
      this.IfStorageIsSuccessful();
    }
  }

  private saveStatesList() {
    this.statesList.forEach(async (x) => {
      if (
        this.emptyPlaceholder(x.name!) &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.rewrite
      ) {
        this.countActionState(true);
        this.dataCountryStateService.deleteState(x.id!).subscribe(() => {
          this.countActionState(false);
        });
      } else if (x.isDirty === 3) {
        this.countActionState(true);
        this.dataCountryStateService.deleteState(x.id!).subscribe(() => {
          this.countActionState(false);
        });
      } else if (
        !this.emptyPlaceholder(x.name!) &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.new
      ) {
        delete x.id;
        this.countActionState(true);
        this.dataCountryStateService.addState(x).subscribe(() => {
          this.countActionState(false);
        });
      } else if (
        this.emptyPlaceholder(x.name!) &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.rewrite
      ) {
        this.countActionState(true);
        this.dataCountryStateService.updateCountry(x).subscribe(() => {
          this.countActionState(false);
        });
      }
    });
  }

  private isStateList_Dirty(): boolean {
    const listOfExcludedObject = ['isDirty'];

    const a = this.statesList as IState[];
    const b = this.statesListDummy as IState[];

    if (!compareComplexObjects(a, b, listOfExcludedObject)) {
      // Bei unfertigen Eingaben wird kein isDirty geworfen
      const tmp = this.statesList.filter(
        (x) =>
          x.isDirty === CreateEntriesEnum.new &&
          (this.emptyPlaceholder(x.name!) ||
            x.abbreviation === '' ||
            x.prefix === '')
      );

      if (tmp && tmp.length !== 0) {
        return false;
      }
      return true;
    }
    return false;
  }

  /* #endregion   states */

  /* #region  Macros */

  readMacroList() {
    this.dataMacroService.readMacroList().subscribe((x) => {
      if (x) {
        this.macroList = x as IMacro[];
        if (this.macroList.length > 1) {
          this.macroList.sort(compare);
          function compare(a: IMacro, b: IMacro) {
            return a.name!.localeCompare(b.name!);
          }
        }
      }

      this.macroListDummy = cloneObject<IMacro[]>(this.macroList);

      this.isReset.set(true);
      setTimeout(() => this.isReset.set(false), 100);
    });
  }

  private isMacroList_Dirty(): boolean {
    const listOfExcludedObject = ['isDirty'];

    const a = this.macroList as IMacro[];
    const b = this.macroListDummy as IMacro[];

    if (!compareComplexObjects(a, b, listOfExcludedObject)) {
      // Bei unfertigen Eingaben wird kein isDirty geworfen
      const tmp = this.macroList.filter(
        (x) =>
          x.isDirty === CreateEntriesEnum.new &&
          x.name === MessageLibrary.NOT_DEFINED
      );

      if (tmp && tmp.length !== 0) {
        return false;
      }

      return true;
    }
    return false;
  }

  private reOrderMacro() {
    this.macroList.sort(compare);
    function compare(a: IMacro, b: IMacro) {
      return a.name!.localeCompare(b.name!);
    }
  }

  private saveMacroList() {
    this.reOrderMacro();

    this.macroList.forEach(async (x) => {
      if (
        x.name &&
        x.name === '' &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.rewrite
      ) {
        if (x.id) {
          this.countActionMacro(true);
          this.dataMacroService.deleteMacro(x.id).subscribe(() => {
            this.countActionMacro(false);
          });
        }
      } else if (x.isDirty === CreateEntriesEnum.delete) {
        if (x.id) {
          this.countActionMacro(true);
          this.dataMacroService.deleteMacro(x.id).subscribe(() => {
            this.countActionMacro(false);
          });
        }
      } else if (
        x.name &&
        x.name !== '' &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.new
      ) {
        delete x.id;
        this.countActionMacro(true);
        this.dataMacroService.addMacro(x).subscribe(() => {
          this.countActionMacro(false);
        });
      } else if (
        x.name &&
        x.name !== '' &&
        x.isDirty &&
        x.isDirty === CreateEntriesEnum.rewrite
      ) {
        this.countActionMacro(true);
        this.dataMacroService.updateMacro(x).subscribe(() => {
          this.countActionMacro(false);
        });
      }
    });
  }

  private countActionMacro(action: boolean) {
    if (action) {
      this.macroListCount++;
    } else {
      this.macroListCount--;
    }
    if (this.macroListCount === 0) {
      this.readMacroList();
    }
  }

  /* #endregion  Macros */

  /* #region   Color Grid */

  /* #endregion   Color Grid */

  areObjectsDirty(): boolean {
    if (this.isSetting_Dirty()) {
      return true;
    }
    if (this.isCountryList_Dirty()) {
      return true;
    }

    if (this.isMacroList_Dirty()) {
      return true;
    }

    if (this.isMacroList_Dirty()) {
      return true;
    }

    if (this.gridColorService.isSetting_Dirty()) {
      return true;
    }

    return false;
  }

  save() {
    if (this.isSetting_Dirty()) {
      this.saveSetting();
    }
    if (this.isCountryList_Dirty()) {
      this.saveCountryList();
    }

    if (this.isMacroList_Dirty()) {
      this.saveMacroList();
    }
    if (this.gridColorService.isSetting_Dirty()) {
      this.gridColorService.save();
    }
  }

  IfStorageIsSuccessful() {
    if (this.settingsCount === 0) {
      this.isDirty = this.areObjectsDirty();
      this.isReset.set(true);
      setTimeout(() => this.isReset.set(false), 100);
    }
  }

  readData() {
    this.readSettingList();
    this.readCountryList();
    this.readStateList();
    this.readMacroList();
    this.readAccountsList();
  }

  resetData() {
    this.readData();
    this.gridColorService.readData();
  }

  private emptyPlaceholder(value: MultiLanguage): boolean {
    const isNotUndefined = value.de && value.en && value.fr && value.it;
    if (isNotUndefined === undefined) {
      return true;
    }

    const isNotEmpty = value.de! + value.en! + value.fr! + value.it!;

    return isNotEmpty === '';
  }
}
