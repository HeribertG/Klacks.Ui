import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
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
import { Subject } from 'rxjs';
import { IMacro } from 'src/app/core/macro-class';
import { DataMacroService } from '../data-macro.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementShiftService {
  public isReset = new Subject<boolean>();
  public initIsRead = new Subject<boolean>();

  // shiftFilter: ShiftFilter = new ShiftFilter();
  // private shiftFilterDummy: shiftFilter | undefined = undefined;

  shift: IShift[] = [];
  editShift: Shift | undefined;
  editShiftDummy: Shift | undefined;
  macroList: IMacro[] = [];

  private isInit = false;
  initCount = 0;
  initFinished = 1;

  constructor(
    public toastService: ToastService,
    private router: Router,
    private dataShiftService: DataShiftService,
    private dataMacroService: DataMacroService
  ) {}

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
      this.initIsRead.next(true);
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

  showExternalShift(id: string) {
    this.dataShiftService.getShift(id).subscribe((x) => {
      const client = x;

      this.prepareShift(x);

      this.router.navigate(['/workplace/edit-address']);
    });
  }

  createShift() {
    const x = new Shift();
    this.prepareShift(x);
    this.router.navigate(['/workplace/edit-shift']);
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
      this.editShiftDummy = cloneObject(this.editShift);
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

  private saveEditShift() {}

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
