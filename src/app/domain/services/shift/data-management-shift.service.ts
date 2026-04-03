// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { IMacro } from 'src/app/domain/models/settings/macro-class';
import { DataMacroService } from 'src/app/infrastructure/api/settings/data-macro.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { ITruncatedShift, ShiftFilter } from 'src/app/domain/models/shift/shift-data-class';
import {
  CheckBoxValue,
  Filter,
  IAddress,
  IClient,
  ICountry,
} from 'src/app/domain/models/client/client-class';
import { IShift, Shift } from 'src/app/domain/models/shift/shift-class';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataCountryStateService } from 'src/app/infrastructure/api/settings/data-country-state.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { ILoadable, IResettable, ISaveable, INavigable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs';
import { CheckboxStateService } from 'src/app/domain/services/shared/checkbox-state.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementShiftService implements ISaveable, IResettable, ILoadable, INavigable {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private dataShiftService = inject(DataShiftService);
  private dataMacroService = inject(DataMacroService);
  public dataClientService = inject(DataClientService);
  private dataCountryStateService = inject(DataCountryStateService);
  private dataManagementGroupService = inject(DataManagementGroupService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();
  private checkboxState = new CheckboxStateService();

  constructor() {
    this.registry.register(
      RouteName.SHIFT,
      DataManagementShiftService
    );
    this.registry.register(
      RouteName.NEW_SHIFT,
      DataManagementShiftService
    );
    this.registry.register(
      RouteName.EDIT_SHIFT,
      DataManagementShiftService
    );
  }

  // IManageable implementation - nur für Edit-Modus
  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isReset = signal(false);
  public isRead = signal(false);
  public makeValidation = signal(false);
  public initIsRead = signal(false);
  public restoreSearch = signal('');

  public listWrapper: ITruncatedShift | undefined;
  public currentFilter: ShiftFilter = new ShiftFilter();
  public currentClientFilter: Filter = new Filter();
  public editGroup: IShift | undefined;

  public onSaveCompleted?: () => void;
  public onBeforeSave?: () => void;
  public onExternalFilterChange?: () => void;
  public isSaveAndClose = false;
  public returnUrl: string | null = null;

  public shifts: IShift[] = [];
  public editShift: Shift | undefined;
  public editShiftDummy: Shift | undefined;
  public macroList: IMacro[] = [];
  public get checkedArray(): CheckBoxValue[] { return this.checkboxState.checkedArray; }
  public set checkedArray(value: CheckBoxValue[]) { this.checkboxState.checkedArray = value; }
  public get headerCheckBoxValue(): boolean { return this.checkboxState.headerCheckBoxValue; }
  public set headerCheckBoxValue(value: boolean) { this.checkboxState.headerCheckBoxValue = value; }
  public stateList: StateCountryToken[] | undefined;
  public maxAddressType = 3;

  private initCount = 0;
  private initFinished = 1;

  public orderBy = 'name';
  public sortOrder = 'desc';
  public requiredPage = 1;
  public numberOfItemsPerPage = 5;
  public maxItems = 0;
  public maxPages = 0;
  public firstItem = 0;
  public orderByGroupItem = 'name';
  public sortOrderGroupItem = 'desc';

  /* #region   init */

  init() {
    this.dataClientService
      .getStateTokenList(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: StateCountryToken[]) => {
        this.stateList = x.filter((c) => c.state !== c.country);
        this.currentClientFilter.filteredStateToken = this.stateList;
        this.currentClientFilter.list = this.stateList;
      });

    this.dataCountryStateService.getCountryList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ICountry[]) => {
        if (x) {
          x.forEach((s) => (s.select = true));
          this.currentClientFilter.countries = x;

          this.currentClientFilter.countriesHaveBeenReadIn = x.length > 0;
        }
      });
    this.initCount = 0;
    this.readMacroList();
  }

  private isInitFinished(hit: number): void {
    this.initCount += hit;
    if (this.initCount === this.initFinished) {
      this.initIsRead.set(true);
      setTimeout(() => this.initIsRead.set(false), 100);
    }
  }

  /* #endregion   init */

  /* #region  Macros */
  readMacroList() {
    this.dataMacroService.readMacroList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((x) => {
        if (x) {
          this.macroList = x as IMacro[];
          if (this.macroList.length > 1) {
            this.macroList.sort(compare);
            function compare(a: IMacro, b: IMacro) {
              return a.name!.localeCompare(b.name!);
            }
          }
          this.isInitFinished(1);
        }
      });
  }

  /* #endregion  Macros */

  /* #region all shift */
  clearCheckedArray() {
    this.checkboxState.clearCheckedArray();
  }

  addCheckBoxValueToArray(value: CheckBoxValue) {
    this.checkboxState.addCheckBoxValueToArray(value);
  }

  findCheckBoxValue(key: string): CheckBoxValue | undefined {
    return this.checkboxState.findCheckBoxValue(key);
  }

  removeCheckBoxValueToArray(key: string) {
    this.checkboxState.removeCheckBoxValueToArray(key);
  }

  checkBoxIndeterminate() {
    return this.checkboxState.checkBoxIndeterminate();
  }

  readPage(isSecondRead = false) {
    this._showProgressSpinner.set(true);
    this.dataShiftService.readShiftList(this.currentFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe((x) => {
        this.shifts = x.shifts;
        this.listWrapper = x;
        this.maxItems = x.maxItems;
        this.firstItem = x.firstItemOnPage;
        this.maxPages = x.maxPages;
        this._showProgressSpinner.set(false);

        if (isSecondRead) {
          this.fireIsReadEvent();
        }

        if (this.onExternalFilterChange) {
          this.onExternalFilterChange();
        }
      });
  }

  fireIsReadEvent() {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  /* #endregion all shift */

  /* #region   edit shift */

  createShift() {
    this.prepareShift(this.prepareNewShift());
  }

  private prepareNewShift(): IShift {
    const value = new Shift();
    value.fromDate = new Date();
    value.startShift = '07:00:00';
    value.endShift = '15:00:00';
    value.workTime = 8;
    value.beforeShift = '';
    value.afterShift = '';
    value.abbreviation = '';
    value.isMonday = true;
    value.isTuesday = true;
    value.isWednesday = true;
    value.isThursday = true;
    value.isFriday = true;
    value.quantity = 1;
    value.sumEmployees = 1;
    value.status = 0;

    return value;
  }

  prepareShift(value: Shift) {
    if (value == null) {
      return;
    }

    this.editShift = value;
    this.editShiftDummy = cloneObject<Shift>(this.editShift);

    setTimeout(() => {
      this.isReset.set(true);
      setTimeout(() => this.isReset.set(false), 100);
    }, 200);
  }

  createUrl(): string {
    return '/workplace/edit-shift/' + this.editShift!.id;
  }

  readShift(id: string) {
    if (id !== '') {
      this.dataShiftService.getShift(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe((x) => {
          const shift = this.createShiftFromPlainObject(x);
          if (shift.fromDate && x.client) {
            const index = this.setCurrentAddressIndex(x.client, shift.fromDate);
            shift.addressName = this.visualNameAndAddress(x.client, index);
          }
          this.prepareShift(shift);
          if (this.editShift && this.editShift.id) {
            setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
          }

          this.fireIsReadEvent();
        });
    }
  }
  save() {
    if (this.onBeforeSave) {
      this.onBeforeSave();
    }
    if (this.isEditShift_Dirty()) {
      this.saveEditShift();
    }
  }

  visualNameAndAddress(value: IClient, index = -1): string {
    let address = `${value.idNumber} - ${value.company} ${value.firstName} ${value.name}`;
    if (index > -1 && value.addresses.length > 0) {
      const currentAddress = value.addresses[index];
      address = address + this.formatAddress(currentAddress);
    }

    return address;
  }

  private formatAddress(currentAddress: IAddress): string {
    const street = currentAddress.street ?? undefined;
    const city = currentAddress.city ?? undefined;
    const zip = currentAddress.zip ?? undefined;
    const country = currentAddress.country ?? undefined;
    let result = '';

    if (street) {
      result = result + street + ', ';
    }
    if (city) {
      result = result + city + ' ';
    }
    if (zip) {
      result = result + zip + ' ';
    }
    if (country) {
      result = result + ', ' + country;
    }

    if (result != '') {
      result = ' ' + result + '.';
    }

    return result;
  }

  private saveEditShift() {
    if (this.editShift) {
      const action = this.editShift.id
        ? this.dataShiftService.updateShift(this.editShift)
        : this.dataShiftService.addShift(this.editShift);

      action
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (x) => {
            const shift = this.createShiftFromPlainObject(x);
            if (shift.fromDate && x.client) {
              const index = this.setCurrentAddressIndex(x.client, shift.fromDate);
              shift.addressName = this.visualNameAndAddress(x.client, index);
            }
            this.prepareShift(shift);
            if (!this.isSaveAndClose && this.editShift && this.editShift.id) {
              setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
            }

            if (this.onSaveCompleted) {
              this.onSaveCompleted();
            }

            this.isSaveAndClose = false;
          },
          error: (error) => {
            if (this.editShift?.id) {
              this.readShift(this.editShift.id);
            } else {
              this.createShift();
            }

            this.eventBus.emit(DomainEventType.ERROR, {
              message: error,
              code: 'ShiftError',
              context: 'DataManagementShiftService.saveEditShift'
            });
            if (this.onSaveCompleted) {
              this.onSaveCompleted();
            }
          },
          complete: () => {},
        });
    }
  }

  private isEditShift_Dirty(): boolean {
    let result = false;
    const a = this.editShift as IShift;
    const b = this.editShiftDummy as IShift;
    const exclude = [
      'startShift',
      'endShift',
      'beforeShift',
      'afterShift',
      'endShift',
      'fromDate',
      'untilDate',
      'travelTimeAfter',
      'travelTimeBefore',
      'workTime',
    ];
    if (!compareComplexObjects(a, b, exclude)) {
      result = this.isValidate();
    }
    this.makeValidation.set(true);
    setTimeout(() => this.makeValidation.set(false), 100);
    return result;
  }

  private isValidate(): boolean {
    const d = this.editShift;
    let isActive = this.isWeekDayActive();
    if (isActive && d) {
      if (
        !d.abbreviation ||
        !d.name ||
        !d.startShift ||
        !d.quantity ||
        !d.sumEmployees
      ) {
        isActive = false;
      }
    }
    if (isActive && d && this.dataManagementGroupService.hasRootGroups()) {
      if (d.groups.length === 0 || d.groups == null) {
        isActive = false;
      }
    }

    return isActive;
  }

  private isWeekDayActive(): boolean {
    if (this.editShift) {
      const d = this.editShift;
      if (d) {
        return (
          d.isMonday ||
          d.isTuesday ||
          d.isWednesday ||
          d.isThursday ||
          d.isFriday ||
          d.isSaturday ||
          d.isSunday ||
          d.isHoliday
        );
      }
    }
    return false;
  }

  areObjectsDirty(): boolean {
    if (this.isEditShift_Dirty()) {
      return true;
    }
    return false;
  }

  resetData() {
    if (this.editShiftDummy) {
      this.prepareShift(this.editShiftDummy);
    }
  }

  private createShiftFromPlainObject(plainObject: IShift): Shift {
    const shift = new Shift();

    Object.assign(shift, plainObject);

    return shift;
  }

  private setCurrentAddressIndex(
    value: IClient,
    fromDate: Date | undefined
  ): number {
    if (value && fromDate && value.addresses.length > 1) {
      value.addresses.sort((a: IAddress, b: IAddress) => {
        const first = a.validFrom as Date;
        const second = b.validFrom as Date;

        return first > second ? -1 : first < second ? 1 : 0;
      });

      const current = fromDate!;
      const collectScopeAddresses = new Array<IAddress>();
      const collectFutureAddresses = new Array<IAddress>();
      let currentIndex = value.addresses.length - 1;

      value.addresses.forEach((itm) => {
        itm.isScoped = false;
        itm.isFuture = false;
        const tmpDate = new Date(itm.validFrom);

        if (tmpDate <= current) {
          collectScopeAddresses.push(itm);
          itm.isScoped = true;
        } else {
          collectFutureAddresses.push(itm);
          itm.isFuture = true;
        }
      });

      collectScopeAddresses.sort((a: IAddress, b: IAddress) => {
        const first = a.type as number;
        const second = b.type as number;

        return first < second ? -1 : first > second ? 0 : 1;
      });

      for (let i = 0; i < this.maxAddressType; i++) {
        const findTypeArray = collectScopeAddresses.filter((x) => x.type === i);
        if (findTypeArray && findTypeArray.length > 0) {
          for (let ii = 1; ii < findTypeArray.length; ii++) {
            findTypeArray[ii].isScoped = false;
          }
        }
      }

      value.addresses.sort((a: IAddress, b: IAddress) => {
        const first = a.type as number;
        const second = b.type as number;
        return first < second ? -1 : first > second ? 0 : 1;
      });

      currentIndex = value.addresses.findIndex(
        (x) => x.id === collectScopeAddresses[0].id
      );

      return currentIndex;
    }
    return 0;
  }

  /* #endregion   edit shift */

  /* #region   temporary check is ShiftFilter dirty */

  private temporaryShiftFilterDummy: ShiftFilter | undefined;

  public setTemporaryShiftFilter() {
    this.temporaryShiftFilterDummy = cloneObject<ShiftFilter>(
      this.currentFilter
    );
  }

  public isTemporaryShiftFilter_Dirty(): boolean {
    const a = this.currentFilter as ShiftFilter;
    const b = this.temporaryShiftFilterDummy as ShiftFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  /* #endregion   temporary check is ShiftFilter dirty */

  goBack(): string {
    if (this.returnUrl) {
      return this.returnUrl;
    }
    return '/workplace/shift';
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
