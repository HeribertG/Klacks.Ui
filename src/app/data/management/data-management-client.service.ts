import { Injectable } from '@angular/core';
import { DataClientService } from '../data-client.service';
import {
  ITruncatedClient,
  Filter,
  IClient,
  CheckBoxValue,
  ICountry,
  ICommunicationType,
  ICommunicationPrefix,
  ICommunication,
  Communication,
  CommunicationPrefix,
  Address,
  Annotation,
  IClientAttribute,
  IAddress,
  Client,
  Membership,
  ExportClient,
  IPostCodeCH,
} from '../../core/client-class';
import {
  compareComplexObjects,
  cloneObject,
  createStringId,
} from '../../helpers/object-helpers';
import { DataCountryStateService } from '../data-country-state.service';
import {
  DateToString,
  isNumeric,
  formatPhoneNumber,
  transformDateToNgbDateStruct,
} from 'src/app/helpers/format-helper';
import { DataSettingsVariousService } from '../data-settings-various.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ToastService } from 'src/app/toast/toast.service';
import {
  AddressTypeEnum,
  CommunicationTypeDefaultIndexEnum,
  GenderEnum,
  InitFinished,
} from 'src/app/helpers/enums/client-enum';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';
import { Gender } from 'src/app/core/enums';

@Injectable({
  providedIn: 'root',
})
export class DataManagementClientService {
  public isReset = new Subject<boolean>();
  public isRead = new Subject<boolean>();
  public isReadChangeList = new Subject<boolean>();
  public isF5ReRead = new Subject<boolean>();
  public initIsRead = new Subject<boolean>();
  public restoreSearch = new Subject<string>();
  public startToReadPage = new Subject<boolean>();

  currentFilter: Filter = new Filter();
  currentFilterDummy: Filter | undefined;
  temporaryFilterDummy: Filter | undefined;
  LastChangeFilter: Filter = new Filter();
  listWrapper: ITruncatedClient | undefined;
  lastChangeListWrapper: ITruncatedClient | undefined;
  editClient: IClient | undefined;
  editClientDummy: IClient | undefined;
  checkedArray: CheckBoxValue[] = new Array<CheckBoxValue>();
  headerCheckBoxValue: boolean = false;
  maxItems = 0;
  firstItem = 0;
  maxPages = 0;

  lastChangeMaxItems: number | undefined;
  subTitleLastChanges = '';
  subTitleLastChangesAllAddress = '';
  stateList: StateCountryToken[] | undefined;

  communicationTypePhoneList: ICommunicationType[] = [];
  communicationTypeEmailList: ICommunicationType[] = [];
  communicationPrefixList: ICommunicationPrefix[] = [];
  communicationPhoneList: ICommunication[] = [];
  communicationEmailList: ICommunication[] = [];
  clientAttribute: IClientAttribute[] = [];
  clientAddressListWithoutQueryFilter: IAddress[] = [];

  lastCountries: IPostCodeCH[] = [];

  isSwissAbbreviation = 'CH';
  isSwissPrefixId = '';
  defaultTypePhone = -1;
  defaultTypeEmail = -1;
  currentAddressIndex = -1;
  currentAnnotationIndex = -1;
  maxAddressType = 3;

  private isInit = false;
  initCount = 0;

  editClientLastMutation = '';
  editClientDeleted = false;

  // Ist für die Ansicht der gefundenen Mitglieder beim
  // Neuanlegen einer Adresse
  findClient: IClient[] = [];
  sortedFindClient: IClient[] = [];
  findClientCount = 0;
  findClientPage = 0;
  findClientMaxVisiblePage = 5;
  findClientMaxPages = 1;
  backupFindClient: IClient | undefined;
  backupFindClientDummy: IClient | undefined;
  backupFindClientList: IClient[] = [];

  constructor(
    public dataClientService: DataClientService,
    public toastService: ToastService,
    private dataCountryStateService: DataCountryStateService,
    public dataSettingsVariousService: DataSettingsVariousService,
    private router: Router
  ) {}

  /* #region   init */

  init() {
    if (this.isInit === false) {
      this.initCount = 0;

      this.currentFilter.countries = [];
      this.currentFilter.countriesHaveBeenReadIn = false;

      this.dataClientService
        .getStateTokenList(true)
        .subscribe((x: StateCountryToken[]) => {
          this.stateList = x.filter((c) => c.state !== c.country);
          this.currentFilter.filteredStateToken = this.stateList;
          this.currentFilter.list = this.stateList;

          this.isInitFinished(1);
        });

      this.dataCountryStateService
        .getCountryList()
        .subscribe((x: ICountry[]) => {
          if (x) {
            x.forEach((s) => (s.select = true));
            this.currentFilter.countries = x;

            this.currentFilter.countriesHaveBeenReadIn = x.length > 0;

            this.communicationPrefixList = [];
            this.currentFilter.countries.forEach((y) => {
              const c = new CommunicationPrefix();
              c.id = y.id!;
              c.name = y.name!.en!;
              c.prefix = y.prefix;
              this.communicationPrefixList.push(c);

              if (y.abbreviation === this.isSwissAbbreviation) {
                this.isSwissPrefixId = y.prefix;
              }
            });

            this.communicationPrefixList.unshift(new CommunicationPrefix());
            this.isInitFinished(1);
          }
        });

      this.dataClientService.readCommunicationTypeList().subscribe((x) => {
        if (x) {
          this.communicationTypePhoneList = x.filter((y) => y.category === 0);
          this.communicationTypeEmailList = x.filter((y) => y.category === 1);

          const tmp = x.find(
            (y) => y.defaultIndex === CommunicationTypeDefaultIndexEnum.phone
          );
          if (tmp) {
            this.defaultTypePhone = tmp.type;
          }

          const tmp1 = x.find(
            (y) => y.defaultIndex === CommunicationTypeDefaultIndexEnum.email
          );
          if (tmp1) {
            this.defaultTypeEmail = tmp1.type;
          }

          this.isInitFinished(1);
        }
      });

      this.isInit = true;
    }
  }

  private isInitFinished(hit: number): void {
    this.initCount += hit;
    if (this.initCount === InitFinished.Finished) {
      this.filterState();
      this.initIsRead.next(true);
    }
  }

  /* #endregion   init */

  /* #region   temporary check is Filter dirty */

  public setTemporaryFilter() {
    this.temporaryFilterDummy = cloneObject(this.currentFilter);
  }

  public isTemoraryFilter_Dirty(): boolean {
    const a = this.currentFilter as Filter;
    const b = this.temporaryFilterDummy as Filter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  /* #endregion   temporary check is Filter dirty */

  /* #region   list client */

  readPage(isSecondRead: boolean = false) {
    if (!isSecondRead) {
      this.startToReadPage.next(true);
    }

    // Hack, vieleicht hilfst es
    if (!this.currentFilter.countries) {
      this.isInit = false;
      this.init();
    }

    if (this.currentFilter.isFilterValid() && this.isInit) {
      this.dataClientService
        .readClientList(this.currentFilter)
        .subscribe((x) => {
          x.clients.forEach((z) => {
            const res = this.clientAttribute.find((y) => +y.type === +z.type);
            if (res) {
              z.typeAbbreviation = res.name.substring(0, 1);
            }
          });

          this.listWrapper = x;
          this.maxItems = x.maxItems;
          this.firstItem = x.firstItemOnPage;
          this.maxPages = x.maxPages;

          if (this.isFilter_Dirty()) {
            this.currentFilterDummy = cloneObject(this.currentFilter);
          }
        });
    }

    if (!isSecondRead) {
      this.isRead.next(true);
    }
  }

  deleteClient(key: string): Observable<IClient> {
    return this.dataClientService.deleteClient(key);
  }

  private isFilter_Dirty(): boolean {
    const a = this.currentFilter as Filter;
    const b = this.currentFilterDummy as Filter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  exportExcel(type: number = 0) {
    const filter = new ExportClient();
    filter.filter = this.currentFilter;
    filter.selectAll = !this.checkBoxIndeterminate();

    if (this.headerCheckBoxValue === true) {
      const tmp = this.checkedArray.find((x) => x.checked === false);
      if (tmp) {
        filter.invertedSelection = true;
      }
    }

    this.checkedArray.forEach((x) => {
      return filter.selection.push(x.id);
    });

    this.showInfo(
      MessageLibrary.PLEASE_BE_PATIENT_EXCEL,
      'PLEASE_BE_PATIENT_EXCEL'
    );
  }

  /* #endregion   list client */

  /* #region   last Change client */

  readChangeList(
    isSecondRead: boolean = false,
    locale: string = MessageLibrary.DEFAULT_LANG
  ) {
    this.dataClientService
      .readChangeList(this.LastChangeFilter)
      .subscribe((x) => {
        x.clients.forEach((z) => {
          const res = this.clientAttribute.find((y) => +y.type === +z.type);
          if (res) {
            z.typeAbbreviation = res.name.substring(0, 1);
          }
        });

        this.lastChangeListWrapper = x;

        this.subTitleLastChanges = `${DateToString(
          x.lastChange,
          locale
        )}, bearbeitet von ${x.editor}`;
        this.lastChangeMaxItems = x.maxItems;

        if (!isSecondRead) {
          this.isReadChangeList.next(true);
        }
      });
  }

  clearCheckedArray() {
    this.checkedArray = new Array<CheckBoxValue>();
  }

  addCheckBoxValueToArray(value: CheckBoxValue) {
    this.checkedArray.push(value);
  }

  findCheckBoxValue(key: string): CheckBoxValue | undefined {
    if (!this.checkedArray) {
      return undefined;
    }
    if (key === '') {
      return undefined;
    }

    return this.checkedArray.find((x) => x.id === key);
  }

  removeCheckBoxValueToArray(key: string) {
    const index = this.checkedArray.findIndex((x) => x.id === key);
    this.checkedArray.splice(index, 1);
  }

  checkBoxIndeterminate() {
    if (this.headerCheckBoxValue === undefined) {
      this.headerCheckBoxValue = false;
    }
    if (this.headerCheckBoxValue === null) {
      this.headerCheckBoxValue = false;
    }

    if (this.headerCheckBoxValue === true) {
      const tmp = this.checkedArray.find((x) => x.checked === false);
      if (!(tmp === undefined || tmp === null)) {
        return true;
      }
    }
    if (this.headerCheckBoxValue === false) {
      const tmp = this.checkedArray.find((x) => x.checked === true);
      if (!(tmp === undefined || tmp === null)) {
        return true;
      }
    }

    return false;
  }

  getLastChangeMetaData(locale: string = MessageLibrary.DEFAULT_LANG) {
    this.dataClientService.getLastChangeMetaData().subscribe((x) => {
      this.subTitleLastChangesAllAddress = `${
        MessageLibrary.LAST_STATE
      } ${DateToString(x.lastChangesDate, locale)}${
        MessageLibrary.EDITED_FROM
      } ${x.autor}`;
    });
  }

  /* #endregion   last Change client */

  /* #region   edit client */

  showExternalClient(id: string) {
    this.dataClientService.getClient(id).subscribe((x) => {
      const client = x;

      this.prepareClient(x);

      this.router.navigate(['/workplace/edit-address']);
    });
  }

  prepareClient(value: IClient, withoutUpdateDummy = false) {
    if (value == null) {
      return;
    }

    // Hack, if a F5 update was executed and not everything is fully initialized
    if (!this.isInit) {
      this.init();
    }

    this.editClient = value;

    this.clientAddressListWithoutQueryFilter = [];
    this.editClientLastMutation = '';

    this.setDateStruc();
    this.setAddress();
    this.setCommunication();
    this.filterState();

    if (!withoutUpdateDummy) {
      this.editClientDummy = cloneObject(this.editClient);
    }

    if (this.editClient.id) {
      setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
    }

    this.isReset.next(true);
    setTimeout(() => {
      this.isRead.next(true);
    }, 300);
  }

  createUrl(): string {
    return 'workplace/edit-address?id=' + this.editClient!.id;
  }

  readClient(id: string) {
    if (id !== '') {
      this.dataClientService.getClient(id).subscribe((x) => {
        // dirty hack
        this.isF5ReRead.next(true);
        this.prepareClient(x);
      });
    }
  }

  isCurrentAddressMainAddress(): boolean {
    return this.editClient!.addresses[this.currentAddressIndex].type === 0;
  }

  filterState() {
    this.stateList = [];
    try {
      if (this.editClient!.addresses.length > 0) {
        const country =
          this.editClient!.addresses[this.currentAddressIndex].country;
        this.stateList = this.currentFilter.list.filter(
          (x) => x.country === country
        );
      }
    } catch {}
  }

  createClient() {
    this.dataClientService.countIdNumber().subscribe((x) => {
      const c = new Client();
      c.membership = new Membership();
      c.membership.validFrom = new Date();
      c.idNumber = x + 1;
      const a = c.addresses[0];
      a.validFrom = new Date();
      a.type = AddressTypeEnum.customer;

      this.prepareClient(c);
      this.resetFindListBackup();

      this.router.navigate(['/workplace/edit-address']);

      setTimeout(() => {
        this.isRead.next(true);
      }, 300);
    });
  }

  removeCurrentAddress() {
    this.editClient!.addresses.splice(this.currentAddressIndex);
    this.setAddress();
  }

  saveEditClient(withoutUpdateDummy = false) {
    if (this.editClient!.id === '') {
      this.dataClientService.addClient(this.editClient!).subscribe((x) => {
        this.prepareClient(x, withoutUpdateDummy);
      });
    } else {
      this.dataClientService.updateClient(this.editClient!).subscribe((x) => {
        this.prepareClient(x);
      });
    }
  }

  writeCity() {
    this.lastCountries = [];

    const address = this.editClient!.addresses[this.currentAddressIndex];
    if (isNumeric(address.zip)) {
      this.dataCountryStateService
        .SearchCity(address.zip)
        .then((res) => {
          if (res!.length === 1) {
            address.city = res![0].city;
            address.state = res![0].state;
            address.country = 'CH';
          } else if (res!.length > 1) {
            address.city = '';
            this.lastCountries = res!;
            address.state = res![0].state;
            address.country = 'CH';
          }
        })
        .catch(() => {
          this.showInfo(MessageLibrary.ZIP_NOT_VALID, 'ZIP_NOT_VALID');
        });
    } else {
      let leftCharacters = address.zip.substring(0, 2);
      leftCharacters = leftCharacters.replace('-', ' ');

      const find = this.currentFilter.countries!.findIndex(
        (x) => x.abbreviation === leftCharacters.toUpperCase().trim()
      );

      if (find !== -1) {
        address.country = leftCharacters.toUpperCase().trim();
      }
    }
    this.filterState();
  }

  addAnnotation() {
    this.editClient!.annotations.push(new Annotation());
  }

  removeCurrentAnnotation() {
    this.editClient!.annotations.splice(this.currentAnnotationIndex, 1);
  }

  readClientAddressListWithoutQueryFilter() {
    if (!this.clientAddressListWithoutQueryFilter)
      this.dataClientService
        .readClientAddressList(this.editClient!.id!)
        .subscribe((x) => {
          this.clientAddressListWithoutQueryFilter = x;
        });
  }

  addPhone() {
    const c = new Communication();
    if (this.defaultTypePhone !== -1) {
      c.type = this.defaultTypePhone;
    } else {
      if (this.communicationTypePhoneList.length > 0) {
        c.type = this.communicationTypePhoneList[0].type;
      }
    }

    c.prefix = this.isSwissPrefixId;
    c.isPhone = true;

    this.editClient!.communications.push(c);

    this.setCommunication();
  }

  delPhone(index: number) {
    this.editClient!.communications.splice(index, 1);

    this.setCommunication();
  }

  addEmail() {
    const c = new Communication();

    if (this.defaultTypeEmail !== -1) {
      c.type = this.defaultTypeEmail;
    } else {
      if (
        this.communicationTypeEmailList &&
        this.communicationTypeEmailList.length > 0
      ) {
        c.type = this.communicationTypeEmailList[0].type;
      }
    }
    c.isEmail = true;

    this.editClient!.communications.push(c);

    this.setCommunication();
  }

  delEmail(index: number) {
    this.editClient!.communications.splice(index, 1);

    this.setCommunication();
  }

  private setDateStruc() {
    this.editClient!.internalBirthdate = transformDateToNgbDateStruct(
      this.editClient!.birthdate!
    );
    this.editClient!.membership!.internalValidFrom =
      transformDateToNgbDateStruct(this.editClient!.membership!.validFrom);
    this.editClient!.membership!.internalValidUntil =
      transformDateToNgbDateStruct(this.editClient!.membership!.validUntil!);
  }

  private setCurrentAddressIndex(): number {
    if (this.currentAddressIndex === -1) {
      // If it has more than one address, select which one is visible
      if (this.editClient!.addresses.length > 1) {
        // first sort by date

        this.editClient!.addresses.sort((a: IAddress, b: IAddress) => {
          const first = a.validFrom as Date;
          const second = b.validFrom as Date;

          return first > second ? -1 : first < second ? 1 : 0;
        });

        // second search the current Address

        const current = new Date();
        const collectScopeAddresses = new Array<IAddress>();
        const collectFutureAddresses = new Array<IAddress>();
        let currentIndex = this.editClient!.addresses.length - 1;

        this.editClient!.addresses.forEach((itm) => {
          itm.isScoped = false;
          itm.isFuture = false;
          const tmpDate = new Date(itm.validFrom);

          // all current and past addresses
          // all future addresses are filtered out here
          if (tmpDate <= current) {
            collectScopeAddresses.push(itm);
            itm.isScoped = true;
            this.editClient!.hasScopeAddress = true;
          } else {
            collectFutureAddresses.push(itm);
            itm.isFuture = true;
            this.editClient!.hasFutureAddress = true;
          }
        });

        collectScopeAddresses.sort((a: IAddress, b: IAddress) => {
          const first = a.type as number;
          const second = b.type as number;

          return first < second ? -1 : first > second ? 0 : 1;
        });

        // all past addresses are sorted out
        for (let i = 0; i < this.maxAddressType; i++) {
          const findTypeArray = collectScopeAddresses.filter(
            (x) => x.type === i
          );
          if (findTypeArray && findTypeArray.length > 0) {
            for (let ii = 1; ii < findTypeArray.length; ii++) {
              findTypeArray[ii].isScoped = false;
              this.editClient!.hasPastAddress = true;
            }
          }
        }

        this.editClient!.addresses.sort((a: IAddress, b: IAddress) => {
          const first = a.type as number;
          const second = b.type as number;
          return first < second ? -1 : first > second ? 0 : 1;
        });

        currentIndex = this.editClient!.addresses.findIndex(
          (x) => x.id === collectScopeAddresses[0].id
        );

        return currentIndex;
      } else {
        this.editClient!.addresses[0].isScoped = true;
        this.editClient!.hasScopeAddress = true;
        return 0;
      }
    }

    return this.currentAddressIndex;
  }

  reReadAddress() {
    this.setAddress();
  }

  private setAddress() {
    let isError = false;
    this.currentAddressIndex = -1;
    try {
      this.currentAddressIndex = this.setCurrentAddressIndex();
    } catch (e) {
      isError = true;
      this.currentAddressIndex = 0;
    }

    if (this.editClient!.addresses.length === 0) {
      const c = new Address();
      c.validFrom = new Date();
      c.isScoped = true;

      this.editClient!.addresses.push(c);
    }
  }

  private setCommunication() {
    let count = 0;
    this.editClient!.communications.forEach((x) => {
      x.internalId = createStringId();

      this.isPhone(x);
      this.isEmail(x);
      x.index = count;
      count++;
    });

    this.communicationPhoneList = this.editClient!.communications.filter(
      (x) => x.isPhone === true
    );
    this.communicationEmailList = this.editClient!.communications.filter(
      (x) => x.isEmail === true
    );

    if (this.communicationPhoneList.length === 0) {
      const c = new Communication();
      if (this.defaultTypePhone !== -1) {
        c.type = this.defaultTypePhone;
      } else {
        if (
          this.communicationTypePhoneList &&
          this.communicationTypePhoneList.length > 0
        ) {
          c.type = this.communicationTypePhoneList[0].type;
        }
      }

      c.prefix = this.isSwissPrefixId;

      c.isPhone = true;
      this.communicationPhoneList.push(c);
    }
    if (this.communicationEmailList.length === 0) {
      const c = new Communication();

      if (this.defaultTypeEmail !== -1) {
        c.type = this.defaultTypeEmail;
      } else {
        if (
          this.communicationTypeEmailList &&
          this.communicationTypeEmailList.length > 0
        ) {
          c.type = this.communicationTypeEmailList[0].type;
        }
      }
      c.isEmail = true;

      this.communicationEmailList.push(c);
    }
  }

  private isPhone(data: ICommunication) {
    if (this.communicationTypePhoneList) {
      const p = this.communicationTypePhoneList.find(
        (x) => +x.type === data.type
      );
      if (p) {
        if ((p.category === 0) === true) {
          data.isPhone = true;
          data.value = formatPhoneNumber(data.value);
        }
      }
    }
  }

  public isEmail(data: ICommunication) {
    if (this.communicationTypeEmailList) {
      const p = this.communicationTypeEmailList.find(
        (x) => +x.type === data.type
      );
      if (p) {
        if ((p.category === 1) === true) {
          data.isEmail = true;
        }
      }
    }
  }

  private isEditClient_Dirty(): boolean {
    const a = this.editClient as IClient;
    const b = this.editClientDummy as IClient;

    if (!compareComplexObjects(a, b)) {
      return this.isValid();
    }
    return false;
  }

  isValid(): boolean {
    if (
      this.editClient?.gender === Gender.LegalEntity &&
      !this.editClient?.company
    ) {
      return false;
    }
    return true;
  }

  /* #endregion   edit client */

  createHTMLAddress(client: Client, currentAddress: Address): string {
    let address = '';

    if (currentAddress) {
      if (currentAddress.type === AddressTypeEnum.customer) {
        if (client.company) {
          address += client.company;
          address += '<br>';
        }
        if (client.title) {
          address += client.title;
          address += '<br>';
        }

        address += client.firstName;
        address += ' ';
        if (client.secondName) {
          address += client.secondName.substring(0, 1);
          address += '. ';
        }
        address += client.name;
        address += '<br>';
        if (currentAddress.street) {
          address += currentAddress.street;
          address += '<br>';
        }
        if (currentAddress.street2) {
          address += currentAddress.street2;
          address += '<br>';
        }
        if (currentAddress.street3) {
          address += currentAddress.street3;
          address += '<br>';
        }
        address += currentAddress.zip;
        address += ' ';
        address += currentAddress.city;
        address += '<br>';
      } else {
        if (currentAddress.addressLine1) {
          address += currentAddress.addressLine1;
          address += '<br>';
        }
        if (currentAddress.addressLine2) {
          address += currentAddress.addressLine2;
          address += '<br>';
        }
        if (currentAddress.street) {
          address += currentAddress.street;
          address += '<br>';
        }
        if (currentAddress.street2) {
          address += currentAddress.street2;
          address += '<br>';
        }
        if (currentAddress.street3) {
          address += currentAddress.street3;
          address += '<br>';
        }
        address += currentAddress.zip;
        address += ' ';
        address += currentAddress.city;
        address += '<br>';
      }
    } else {
      address = 'keine Adresse';
    }

    return address;
  }

  readGender(client: Client): string {
    switch (+client.gender as GenderEnum) {
      case GenderEnum.female:
        return 'Frau';

      case GenderEnum.male:
        return 'Herr';
    }
    return '';
  }

  readSalutation(client: Client): string {
    switch (+client.gender as GenderEnum) {
      case GenderEnum.female:
        return 'Sehr geehrte Frau ';

      case GenderEnum.male:
        return 'Sehr geehrter Herr ';
    }
    return 'Werte Damen und Herren ';
  }

  getHtmlWrapString(str: string): string {
    str = str.replace('\r\n', '\n');
    str = str.replace('\r', '\n');
    const spl = str.split('\n');

    let res = '';
    if (spl.length > 1) {
      for (let i = 0; i < spl.length; i++) {
        const item = spl[i];

        if (i < spl.length - 1) {
          res += item + '<br>';
        } else {
          res += item;
        }
      }
    } else {
      res = str;
    }

    return res;
  }

  francAmounts(value: number): string {
    return Math.floor(value).toString();
  }
  centAmounts(value: number): string {
    const s1 = Math.floor(value);
    const res = ((value * 100 - s1 * 100) / 100).toString();
    let result = res.substring(2, 4);

    if (result.length === 0) {
      result += '00';
    }
    if (result.length === 1) {
      result += '0';
    }

    return result;
  }

  /* #endregion   create Infos */

  /* #region   find Clients */

  findClients() {
    if (!this.editClient!.id) {
      let company = this.editClient!.company ?? '';
      let name = this.editClient!.name ?? '';
      let firstName = this.editClient!.firstName ?? '';

      if (company || name || firstName) {
        company += ' ';
        name += ' ';
        firstName += ' ';

        this.dataClientService
          .findClient(company, name, firstName)
          .subscribe((x) => {
            this.doSortFindClient(x);
          });
      } else {
        this.resetFindList();
        this.resetFindListBackup();
      }
    }
  }

  private resetFindListBackup() {
    this.backupFindClient = undefined;
    this.backupFindClientDummy = undefined;
    this.backupFindClientList = new Array<IClient>();
  }

  private resetFindList() {
    this.findClient = [];
    this.findClientCount = 0;
    this.sortedFindClient = [];
    this.findClientPage = 0;
  }

  doSortFindClient(lst: IClient[]) {
    this.findClientCount = lst.length;
    this.findClientMaxPages = Math.ceil(
      this.findClientCount / this.findClientMaxVisiblePage
    );
    this.findClient = lst;

    if (this.findClientCount <= this.findClientMaxVisiblePage) {
      this.sortedFindClient = lst;
      this.findClientPage = 0;
    } else {
      this.sortedFindClient = lst;
      this.findClientPage = 1;
      this.readActualSortedClientPage();
    }
  }

  readActualSortedClientPage() {
    const currPage = this.findClientPage - 1 < 0 ? 0 : this.findClientPage - 1;
    const startItem = currPage * this.findClientMaxVisiblePage;
    const endItem = startItem + this.findClientMaxVisiblePage;
    this.sortedFindClient = this.findClient.slice(startItem, endItem);
  }

  replaceClient(id: string) {
    this.backupFindClient = cloneObject(this.editClient);
    this.backupFindClientDummy = cloneObject(this.editClientDummy);
    this.backupFindClientList = cloneObject(this.findClient);
    this.readClient(id);
  }

  resetFindClient() {
    this.editClient = cloneObject(this.backupFindClient);
    this.editClientDummy = cloneObject(this.backupFindClientDummy);
    this.findClient = cloneObject(this.backupFindClientList);

    this.resetFindListBackup();
    this.prepareClient(this.editClient!, true);
  }

  /* #endregion   find Clients */

  areObjectsDirty(): boolean {
    if (this.isEditClient_Dirty()) {
      return true;
    }
    return false;
  }

  save() {
    if (this.isEditClient_Dirty()) {
      this.saveEditClient();
    }
  }

  resetData() {
    this.prepareClient(this.editClientDummy!);
  }

  showInfo(Message: string, infoName = '') {
    if (infoName) {
      const y = this.toastService.toasts.find((x) => x.name === infoName);
      this.toastService.remove(y);
    }
    this.toastService.show(Message, {
      classname: 'bg-info text-light',
      delay: 5000,
      name: infoName,
      autohide: true,
      headertext: 'Info',
    });
  }
}
