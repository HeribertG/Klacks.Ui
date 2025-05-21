import { inject, Injectable, signal } from '@angular/core';
import { IShift, Shift } from 'src/app/core/schedule-class';
import {
  transformDateToNgbDateStruct,
  transformNumberToOwnTime,
  transformStringToOwnTimeStruct,
} from 'src/app/helpers/format-helper';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ToastService } from 'src/app/toast/toast.service';
import { DataShiftService } from '../data-shift.service';
import { IMacro } from 'src/app/core/macro-class';
import { DataMacroService } from '../data-macro.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { ITruncatedShift, ShiftFilter } from 'src/app/core/shift-data-class';
import { CheckBoxValue } from 'src/app/core/client-class';

@Injectable({
  providedIn: 'root',
})
export class DataManagementShiftService {
  public toastService = inject(ToastService);
  private navigationService = inject(NavigationService);
  private dataShiftService = inject(DataShiftService);
  private dataMacroService = inject(DataMacroService);

  public isReset = signal(false);
  public isRead = signal(false);
  public showProgressSpinner = signal(false);
  public initIsRead = signal(false);
  public restoreSearch = signal('');

  public listWrapper: ITruncatedShift | undefined;
  public currentFilter: ShiftFilter = new ShiftFilter();
  public editGroup: IShift | undefined;

  public shift: IShift[] = [];
  public editShift: Shift | undefined;
  public editShiftDummy: Shift | undefined;
  public macroList: IMacro[] = [];
  public checkedArray: CheckBoxValue[] = new Array<CheckBoxValue>();
  public headerCheckBoxValue = false;

  private isInit = false;
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
    if (this.isInit === false) {
      this.initCount = 0;
      this.readMacroList();
      this.isInit = true;
    }
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
    this.dataMacroService.readMacroList().subscribe((x) => {
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

  /* #region   edit shift */
  /* #region all shift */
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

  readPage(isSecondRead = false) {
    this.showProgressSpinner.set(true);
    this.dataShiftService.readShiftList(this.currentFilter).subscribe((x) => {
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

  fireIsReadEvent() {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  /* #endregion all shift */

  showExternalShift(id: string) {
    this.dataShiftService.getShift(id).subscribe((x) => {
      this.prepareShift(x);

      this.navigationService.navigateToEditAddress();
    });
  }

  createShift() {
    const x = new Shift();
    this.prepareShift(x);
    this.navigationService.navigateToEditShift();
  }

  prepareShift(value: IShift, withoutUpdateDummy = false) {
    if (value == null) {
      return;
    }

    value.fromDate = new Date();
    value.startShift = '08:00';
    value.endShift = '16:00';
    value.workTime = 8;
    value.beforeShift = '';
    value.afterShift = '';
    value.abbreviation = 'abc';
    value.isMonday = true;
    value.isTuesday = true;
    value.isWednesday = true;
    value.isThursday = true;
    value.isFriday = true;
    value.quantity = 1;

    this.editShift = value;

    this.setDateStruc();
    this.setTimeStruc();

    if (!withoutUpdateDummy) {
      this.editShiftDummy = cloneObject<Shift>(this.editShift);
    }

    if (this.editShift.id) {
      setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
    }
  }

  createUrl(): string {
    return 'workplace/edit-shift?id=' + this.editShift!.id;
  }

  readShift(id: string) {
    if (id !== '') {
      this.dataShiftService.getShift(id).subscribe((x) => {
        this.prepareShift(x);
      });
    }
  }

  save() {
    if (this.isEditShift_Dirty()) {
      this.saveEditShift();
    }
  }

  private saveEditShift(withoutUpdateDummy = false) {
    this.editShift;
    if (this.editShift) {
      const action = this.editShift.id
        ? this.dataShiftService.updateShift(this.editShift)
        : this.dataShiftService.addShift(this.editShift);

      action.subscribe({
        next: (x) => {
          this.prepareShift(x, withoutUpdateDummy);
        },
        error: (error) => {
          if (this.editShift?.id) {
            this.readShift(this.editShift.id);
          } else {
            this.createShift();
          }

          this.showError(error, 'ShiftError');
        },
        complete: () => {},
      });
    }
  }

  /* #endregion   edit shift */

  private isEditShift_Dirty(): boolean {
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
      return this.isValid();
    }
    return false;
  }

  isValid(): boolean {
    const isActive = this.isWeekDayActive();
    const d = this.editShift;
    if (d) {
      if (!d.abbreviation || !d.startShift || !d.quantity || !isActive) {
        return false;
      }
    }
    return true;
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
    this.prepareShift(this.editShiftDummy!);
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

  private setDateStruc() {
    if (this.editShift) {
      if (this.editShift.fromDate) {
        this.editShift.internalFromDate = transformDateToNgbDateStruct(
          this.editShift.fromDate
        );
      }

      if (this.editShift.untilDate) {
        this.editShift.internalUntilDate = transformDateToNgbDateStruct(
          this.editShift.untilDate
        );
      }
    }
  }

  private setTimeStruc() {
    if (this.editShift) {
      this.editShift.internalStartShift = transformStringToOwnTimeStruct(
        this.editShift.startShift
      );

      this.editShift.internalEndShift = transformStringToOwnTimeStruct(
        this.editShift.endShift
      );

      this.editShift.internalBeforeShift = transformStringToOwnTimeStruct(
        this.editShift.beforeShift
      );

      this.editShift.internalAfterShift = transformStringToOwnTimeStruct(
        this.editShift.afterShift
      );

      this.editShift.internalTravelTimeAfter = transformStringToOwnTimeStruct(
        this.editShift.travelTimeAfter
      );
      this.editShift.internalTravelTimeBefore = transformStringToOwnTimeStruct(
        this.editShift.travelTimeBefore
      );

      this.editShift.internalWorkTime = transformNumberToOwnTime(
        this.editShift.workTime
      );
    }
  }
}
