import { Injectable, signal } from '@angular/core';
import {
  CheckBoxValue,
  Client,
  Filter,
  IClient,
  IClientAttribute,
  ICountry,
  ITruncatedClient,
} from 'src/app/core/client-class';
import {
  Group,
  GroupFilter,
  GroupItem,
  IGroup,
  ITruncatedGroup,
} from 'src/app/core/group-class';
import { DataClientService } from '../data-client.service';
import { ToastService } from 'src/app/toast/toast.service';
import { DataGroupService } from '../data-group.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import {
  isNgbDateStructValid,
  transformDateToNgbDateStruct,
} from 'src/app/helpers/format-helper';
import { DataCountryStateService } from '../data-country-state.service';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Injectable({
  providedIn: 'root',
})
export class DataManagementGroupService {
  public isReset = signal(false);
  public isRead = signal(false);
  public showProgressSpinner = signal(false);
  public initIsRead = signal(false);
  public restoreSearch = signal('');

  public currentClientFilter: Filter = new Filter();
  public checkedArray: CheckBoxValue[] = new Array<CheckBoxValue>();
  public clientAttribute: IClientAttribute[] = [];
  public headerCheckBoxValue: boolean = false;
  public stateList: StateCountryToken[] | undefined;

  public orderBy = 'name';
  public sortOrder = 'desc';
  public requiredPage = 1;
  public numberOfItemsPerPage = 5;
  public maxItems = 0;
  public maxPages = 0;
  public firstItem = 0;
  public orderByGroupItem = 'name';
  public sortOrderGroupItem = 'desc';

  public listClientWrapper: ITruncatedClient | undefined;
  public listWrapper: ITruncatedGroup | undefined;
  public currentFilter: GroupFilter = new GroupFilter();
  public editGroup: IGroup | undefined;

  private currentFilterDummy: GroupFilter | undefined;
  private editGroupDummy: IGroup | undefined;
  private currentClientFilterDummy: Filter | undefined;
  private temporaryClientFilterDummy: Filter | undefined;

  constructor(
    public dataClientService: DataClientService,
    public dataGroupService: DataGroupService,
    public toastService: ToastService,
    private dataCountryStateService: DataCountryStateService,
    private router: Router
  ) {}

  /* #region   init */
  init() {
    this.dataClientService
      .getStateTokenList(true)
      .subscribe((x: StateCountryToken[]) => {
        this.stateList = x.filter((c) => c.state !== c.country);
        this.currentClientFilter.filteredStateToken = this.stateList;
        this.currentClientFilter.list = this.stateList;
      });

    this.dataCountryStateService.getCountryList().subscribe((x: ICountry[]) => {
      if (x) {
        x.forEach((s) => (s.select = true));
        this.currentClientFilter.countries = x;

        this.currentClientFilter.countriesHaveBeenReadIn = x.length > 0;
      }
    });
    this.currentFilter.setEmpty();
    this.readPage();
  }

  /* #endregion   init */

  showExternalClient(id: string) {
    this.dataGroupService.getGroup(id).subscribe((x) => {
      const client = x;

      this.prepareGroup(x);

      this.router.navigate(['/workplace/edit-group']);
    });
  }
  readPageClient() {
    this.showProgressSpinner.set(true);

    this.dataClientService
      .readClientList(this.currentClientFilter)
      .subscribe((x) => {
        this.listClientWrapper = x;
        this.maxItems = x.maxItems;
        this.firstItem = x.firstItemOnPage;
        this.maxPages = x.maxPages;
      });
    this.showProgressSpinner.set(false);
    this.fireIsReadEvent();
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

  readPage(isSecondRead: boolean = false) {
    this.showProgressSpinner.set(true);
    this.dataGroupService.readGroupList(this.currentFilter).subscribe((x) => {
      this.listWrapper = x;
      this.maxItems = x.maxItems;
      this.firstItem = x.firstItemOnPage;
      this.maxPages = x.maxPages;
    });

    if (isSecondRead) {
      this.fireIsReadEvent();
    }
    this.showProgressSpinner.set(false);
  }

  deleteGroup(key: string): Observable<IGroup> {
    return this.dataGroupService.deleteGroup(key);
  }

  /* #region   edit Group */

  createGroup() {
    this.showProgressSpinner.set(true);
    const c = new Group();
    c.validFrom = new Date();

    this.prepareGroup(c);

    this.router.navigate(['/workplace/edit-group']);

    setTimeout(() => {
      this.fireIsReadEvent();
    }, 300);

    this.showProgressSpinner.set(false);
  }

  prepareGroup(value: IGroup, withoutUpdateDummy = false) {
    this.setDateStruc(value);
    if (value == null) {
      return;
    }

    this.editGroup = value;

    this.sortGroupItems();

    if (!withoutUpdateDummy) {
      this.editGroupDummy = cloneObject<IGroup>(this.editGroup);
    }

    if (this.editGroup.id) {
      setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
    }

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  saveEditGroup(withoutUpdateDummy = false) {
    if (this.editGroup) {
      const action = this.editGroup.id
        ? this.dataGroupService.updateGroup(this.editGroup)
        : this.dataGroupService.addGroup(this.editGroup);

      action.subscribe({
        next: (x) => {
          this.prepareGroup(x, withoutUpdateDummy);
        },
        error: (error) => {
          if (this.editGroup?.id) {
            this.readGroup(this.editGroup.id);
          } else {
            this.createGroup();
          }

          this.showError(error, 'GroupError');
        },
        complete: () => {},
      });
    }
  }

  createUrl(): string {
    return 'workplace/edit-group?id=' + this.editGroup!.id;
  }

  readGroup(id: string) {
    if (id) {
      this.dataGroupService.getGroup(id).subscribe((x) => {
        this.prepareGroup(x);
      });
    }
  }

  resetData() {
    this.prepareGroup(this.editGroupDummy!);
  }

  private setDateStruc(value: IGroup) {
    if (value) {
      value.internalValidFrom = transformDateToNgbDateStruct(value.validFrom);
      if (value.validUntil) {
        value.internalValidUntil = transformDateToNgbDateStruct(
          value.validUntil
        );
      }
    }
  }

  areObjectsDirty(): boolean {
    if (this.isEditGroup_Dirty()) {
      return true;
    }
    return false;
  }

  save() {
    if (this.isEditGroup_Dirty()) {
      this.saveEditGroup();
    }
  }

  add(value: IClient) {
    if (this.editGroup) {
      const item = new GroupItem();
      item.client = value as Client;
      item.clientId = value.id;
      item.groupId = this.editGroup.id;
      this.editGroup.groupItems.push(item);

      this.sortGroupItems();
    }
  }

  sortGroupItems() {
    if (this.editGroup && this.editGroup.groupItems) {
      this.editGroup.groupItems.sort((a, b) => {
        let result = 0;

        if (this.orderByGroupItem == 'idNumber') {
          result = (a.client?.idNumber || 0) - (b.client?.idNumber || 0);
        } else if (this.orderByGroupItem == 'company') {
          result = (a.client?.company || '').localeCompare(
            b.client?.company || ''
          );
        } else if (this.orderByGroupItem == 'name') {
          result = (a.client?.name || '').localeCompare(b.client?.name || '');
        } else if (this.orderByGroupItem == 'firstName') {
          result = (a.client?.firstName || '').localeCompare(
            b.client?.firstName || ''
          );
        }

        if (this.sortOrderGroupItem === 'desc') {
          return -result;
        }

        return result;
      });
    }
  }

  private isEditGroup_Dirty(): boolean {
    const a = this.editGroup as IGroup;
    const b = this.editGroupDummy as IGroup;

    if (!compareComplexObjects(a, b)) {
      return this.isValid();
    }
    return false;
  }

  private isValid(): boolean {
    if (
      this.editGroup?.name &&
      this.editGroup?.validFrom &&
      this.editGroup?.internalValidFrom &&
      isNgbDateStructValid(this.editGroup?.internalValidFrom)
    ) {
      return true;
    }
    return false;
  }

  /* #endregion   edit Group */

  /* #region   temporary check is Filter dirty */

  public setTemporaryFilter() {
    this.temporaryClientFilterDummy = cloneObject<Filter>(
      this.currentClientFilter
    );
  }

  public isTemoraryFilter_Dirty(): boolean {
    const a = this.currentClientFilter as Filter;
    const b = this.temporaryClientFilterDummy as Filter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  /* #endregion   temporary check is Filter dirty */

  showError(Message: string, errorName = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(Message, {
      classname: 'bg-danger text-light',
      delay: 3000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
    });
  }

  fireIsReadEvent() {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }
}
