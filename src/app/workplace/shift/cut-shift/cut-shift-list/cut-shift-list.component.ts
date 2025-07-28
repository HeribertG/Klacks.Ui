/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ViewChild,
  TemplateRef,
  inject,
  Input,
  OnInit,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  NgbModal,
  NgbCalendar,
  NgbDate,
  NgbDatepickerModule,
} from '@ng-bootstrap/ng-bootstrap';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OwnTime } from 'src/app/core/schedule-class';
import { CutTableComponent } from '../cut-table/cut-table.component';
import { IShift, Shift, ShiftStatus } from 'src/app/core/shift-class';
import { DataManagementShiftCutService } from 'src/app/data/management/data-management-shift-cut.service';
import {
  transformStringToOwnTimeStruct,
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
  newGuid,
} from 'src/app/helpers/format-helper';
import { cloneObject } from 'src/app/helpers/object-helpers';

@Component({
  selector: 'app-cut-shift-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbDatepickerModule,
    FontAwesomeModule,
    CutTableComponent,
  ],
  templateUrl: './cut-shift-list.component.html',
  styleUrl: './cut-shift-list.component.scss',
})
export class CutShiftListComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementShiftCutService = inject(DataManagementShiftCutService);
  private modalService = inject(NgbModal);
  private calendar = inject(NgbCalendar);

  @ViewChild('cutDateModal', { static: true }) cutDateModal!: TemplateRef<any>;
  @ViewChild('cutTimeModal', { static: true }) cutTimeModal!: TemplateRef<any>;
  @ViewChild('cutWeekdaysModal', { static: true })
  cutWeekdaysModal!: TemplateRef<any>;
  @ViewChild('cutStaffModal', { static: true })
  cutStaffModal!: TemplateRef<any>;
  @ViewChild('cutTaskModal', { static: true }) cutTaskModal!: TemplateRef<any>;

  cutDate: NgbDate | null = null;
  minDate!: NgbDate;
  maxDate!: NgbDate;
  faCalendar = faCalendar;
  cutTimeShift = OwnTime.forTime();
  minTimeShift: OwnTime | null = null;
  maxTimeShift: OwnTime | null = null;
  isOverMidnight = false;
  is24Hours = false;

  weekdays = {
    isMonday: false,
    isTuesday: false,
    isWednesday: false,
    isThursday: false,
    isFriday: false,
    isSaturday: false,
    isSunday: false,
    isHoliday: false,
    isWeekdayOrHoliday: false,
  };

  staffCount = 1;
  taskCount = 1;
  minStaffCount = 1;
  maxStaffCount = 100;
  minTaskCount = 1;
  maxTaskCount = 50;

  @Input() isCutDateEnabled = true;
  @Input() isCutTimeEnabled = true;
  @Input() isCutWeekdaysEnabled = true;
  @Input() isCutStaffEnabled = true;
  @Input() isCutTaskEnabled = false;
  @Input() isMondayEnabled = true;
  @Input() isTuesdayEnabled = true;
  @Input() isWednesdayEnabled = true;
  @Input() isThursdayEnabled = true;
  @Input() isFridayEnabled = true;
  @Input() isSaturdayEnabled = false;
  @Input() isSundayEnabled = false;
  @Input() isHolidayEnabled = true;
  @Input() isWeekdayOrHolidayEnabled = true;

  @Input() shifts: IShift[] = [];

  public selectedShift: Shift | undefined = undefined;

  ngOnInit(): void {
    this.resetAllParameters();
  }

  onKeyUpInput(event: any, value: string): void {
    this.validateAndCorrectTime();
  }

  OnChangeTime(): void {
    this.validateAndCorrectTime();
  }

  private validateAndCorrectTime(): void {
    if (!this.minTimeShift || !this.maxTimeShift) {
      return;
    }

    const currentMinutes = this.cutTimeShift.toMinutes();
    const minMinutes = this.minTimeShift.toMinutes();
    const maxMinutes = this.maxTimeShift.toMinutes();
    if (this.is24Hours) {
      if (currentMinutes === minMinutes) {
        const newMinutes = (currentMinutes + 1) % (24 * 60);
        this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        this.cutTimeShift.minutes = (newMinutes % 60).toString();
      }
      return;
    }

    if (this.isOverMidnight) {
      const isInvalidRange =
        currentMinutes > maxMinutes && currentMinutes < minMinutes;

      if (isInvalidRange) {
        const distanceToStart = Math.abs(minMinutes - currentMinutes);
        const distanceToEnd = Math.abs(currentMinutes - maxMinutes);

        if (distanceToStart <= distanceToEnd) {
          this.cutTimeShift.hours = Math.floor(minMinutes / 60).toString();
          this.cutTimeShift.minutes = (minMinutes % 60).toString();
        } else {
          this.cutTimeShift.hours = Math.floor(maxMinutes / 60).toString();
          this.cutTimeShift.minutes = (maxMinutes % 60).toString();
        }
      }
    } else {
      if (currentMinutes <= minMinutes) {
        const newMinutes = minMinutes + 1;
        this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        this.cutTimeShift.minutes = (newMinutes % 60).toString();
      } else if (currentMinutes >= maxMinutes) {
        const newMinutes = maxMinutes - 1;
        this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        this.cutTimeShift.minutes = (newMinutes % 60).toString();
      }
    }
  }

  onCutDate(): void {
    if (!this.isCutDateEnabled) {
      return;
    }
    this.modalService
      .open(this.cutDateModal, {
        size: 'sm',
        centered: true,
        windowClass: 'modal-window',
      })
      .result.then(() => {
        this.performCutByDate();
      });
  }

  onCutTime(): void {
    if (!this.isCutTimeEnabled) {
      return;
    }
    this.modalService
      .open(this.cutTimeModal, {
        size: 'sm',
        centered: true,
        windowClass: 'modal-window',
      })
      .result.then(() => {
        this.performCutByTime();
      });
  }

  onCutWeekdays(): void {
    this.modalService
      .open(this.cutWeekdaysModal, {
        size: 'md',
        centered: true,
        windowClass: 'modal-window',
      })
      .result.then(() => {
        this.performCutByWeekdays();
      });
  }

  onCutStaff(): void {
    this.modalService
      .open(this.cutStaffModal, {
        size: 'sm',
        centered: true,
        windowClass: 'modal-window',
      })
      .result.then(() => {
        this.performCutByStaff();
      });
  }

  onCutTask(): void {
    this.modalService
      .open(this.cutTaskModal, {
        size: 'sm',
        centered: true,
        windowClass: 'modal-window',
      })
      .result.then(() => {
        this.performCutByTask();
      });
  }

  onTableRowClicked(shift: Shift): void {
    this.resetAllParameters();
    this.selectedShift = shift;

    if (shift) {
      this.analyzeCutByDate(shift);
      this.analyzeCutByTime(shift);
      this.analyzeCutByWeekdays(shift);
      this.analyzeCutByStaff(shift);
      this.analyzeCutByTask(shift);
    }
  }

  onCellUpdated(event: { shift: Shift; field: string; value: string }): void {
    switch (event.field) {
      case 'name':
        event.shift.name = event.value;
        break;
      case 'description':
        event.shift.description = event.value;
        break;
      case 'abbreviation':
        event.shift.abbreviation = event.value;
        break;
    }

    this.isChangingEvent.emit(true);
  }

  private analyzeCutByDate(shift: Shift): void {
    if (shift.fromDate || shift.untilDate) {
      this.isCutDateEnabled = true;

      if (shift.fromDate) {
        const ngbFromDate = transformDateToNgbDateStruct(shift.fromDate);

        if (ngbFromDate) {
          const fromDate = NgbDate.from(ngbFromDate);
          if (fromDate) {
            this.minDate = this.calendar.getNext(fromDate, 'd', 1);
            this.cutDate = this.minDate;
          }
        }
      }

      if (shift.untilDate) {
        const ngbUntilDate = transformDateToNgbDateStruct(shift.untilDate);

        if (ngbUntilDate) {
          const untilDate = NgbDate.from(ngbUntilDate);
          if (untilDate) {
            this.maxDate = untilDate;
          }
        }
      } else {
        if (this.minDate) {
          this.maxDate = this.calendar.getNext(this.minDate, 'y', 1);
        }
      }
    }
  }

  private analyzeCutByTime(shift: Shift): void {
    const normalizedStartShift = shift.startShift
      .split(':')
      .slice(0, 2)
      .join(':');
    const normalizedEndShift = shift.endShift.split(':').slice(0, 2).join(':');

    shift.internalStartShift =
      transformStringToOwnTimeStruct(normalizedStartShift);
    shift.internalEndShift = transformStringToOwnTimeStruct(normalizedEndShift);

    if (shift.internalStartShift && shift.internalEndShift) {
      const startMinutes = shift.internalStartShift.toMinutes();
      const endMinutes = shift.internalEndShift.toMinutes();

      let totalMinutes: number;

      if (startMinutes === endMinutes) {
        totalMinutes = 24 * 60;
        this.is24Hours = true;
        this.isOverMidnight = false;
      } else if (endMinutes < startMinutes) {
        totalMinutes = 24 * 60 - startMinutes + endMinutes;
        this.is24Hours = false;
        this.isOverMidnight = true;
      } else {
        totalMinutes = endMinutes - startMinutes;
        this.is24Hours = false;
        this.isOverMidnight = false;
      }

      if (totalMinutes > 1) {
        this.isCutTimeEnabled = true;

        this.minTimeShift = shift.internalStartShift;
        this.maxTimeShift = shift.internalEndShift;

        if (this.is24Hours) {
          const defaultCutHour =
            (Number(shift.internalStartShift.hours) + 1) % 24;
          this.cutTimeShift = OwnTime.forTime(defaultCutHour.toString(), '0');
        } else if (this.isOverMidnight) {
          const midMinutes = startMinutes + Math.floor(totalMinutes / 2);
          let midHours: number;
          let remainingMinutes: number;

          if (midMinutes >= 24 * 60) {
            const adjustedMinutes = midMinutes - 24 * 60;
            midHours = Math.floor(adjustedMinutes / 60);
            remainingMinutes = adjustedMinutes % 60;
          } else {
            midHours = Math.floor(midMinutes / 60);
            remainingMinutes = midMinutes % 60;
          }

          this.cutTimeShift = OwnTime.forTime(
            midHours.toString(),
            remainingMinutes.toString()
          );
        } else {
          const midMinutes = startMinutes + Math.floor(totalMinutes / 2);
          const midHours = Math.floor(midMinutes / 60);
          const remainingMinutes = midMinutes % 60;
          this.cutTimeShift = OwnTime.forTime(
            midHours.toString(),
            remainingMinutes.toString()
          );
        }
      }
    }
  }

  private analyzeCutByWeekdays(shift: Shift): void {
    let selectedCount = 0;
    if (shift.isMonday) selectedCount++;
    if (shift.isTuesday) selectedCount++;
    if (shift.isWednesday) selectedCount++;
    if (shift.isThursday) selectedCount++;
    if (shift.isFriday) selectedCount++;
    if (shift.isSaturday) selectedCount++;
    if (shift.isSunday) selectedCount++;

    if (shift.isHoliday && !shift.isWeekdayOrHoliday) selectedCount++;
    if (shift.isWeekdayOrHoliday && !shift.isHoliday) selectedCount++;

    if (selectedCount >= 2) {
      this.isCutWeekdaysEnabled = true;

      this.weekdays.isMonday = false;
      this.weekdays.isTuesday = false;
      this.weekdays.isWednesday = false;
      this.weekdays.isThursday = false;
      this.weekdays.isFriday = false;
      this.weekdays.isSaturday = false;
      this.weekdays.isSunday = false;

      if (shift.isHoliday && shift.isWeekdayOrHoliday) {
        this.weekdays.isHoliday = false;
        this.weekdays.isWeekdayOrHoliday = true;
      } else {
        this.weekdays.isHoliday = shift.isHoliday;
        this.weekdays.isWeekdayOrHoliday = shift.isWeekdayOrHoliday;
      }

      this.isMondayEnabled = shift.isMonday;
      this.isTuesdayEnabled = shift.isTuesday;
      this.isWednesdayEnabled = shift.isWednesday;
      this.isThursdayEnabled = shift.isThursday;
      this.isFridayEnabled = shift.isFriday;
      this.isSaturdayEnabled = shift.isSaturday;
      this.isSundayEnabled = shift.isSunday;

      if (shift.isHoliday && shift.isWeekdayOrHoliday) {
        this.isHolidayEnabled = false;
        this.isWeekdayOrHolidayEnabled = true;
      } else {
        this.isHolidayEnabled = shift.isHoliday;
        this.isWeekdayOrHolidayEnabled = shift.isWeekdayOrHoliday;
      }
    }
  }

  private analyzeCutByStaff(shift: Shift): void {
    if (shift.sumEmployees && shift.sumEmployees > 1) {
      this.isCutStaffEnabled = true;
      this.staffCount = shift.sumEmployees;
    }
  }

  private analyzeCutByTask(shift: Shift): void {
    if (shift.quantity && shift.quantity > 1) {
      this.isCutTaskEnabled = true;
      this.taskCount = shift.quantity;
    }
  }

  private performCutByDate(): void {
    if (!this.selectedShift || !this.cutDate) {
      return;
    }

    const cutDateAsDate = transformNgbDateStructToDate(this.cutDate);
    if (!cutDateAsDate) {
      return;
    }

    const copiedShift = cloneObject<Shift>(this.selectedShift);

    this.restoreOwnTimeObjects(copiedShift);

    const dayBeforeCut = new Date(cutDateAsDate);
    dayBeforeCut.setDate(dayBeforeCut.getDate() - 1);
    this.selectedShift.untilDate = dayBeforeCut;
    this.selectedShift.internalUntilDate =
      transformDateToNgbDateStruct(dayBeforeCut);

    this.prepareCutShift(copiedShift, {
      fromDate: cutDateAsDate,
      internalFromDate: transformDateToNgbDateStruct(cutDateAsDate),
    });

    this.selectedShift.status = ShiftStatus.IsCut;

    this.dataManagementShiftCutService.addCutShift(copiedShift);

    this.dataManagementShiftCutService.calculateNestedSetValues(
      copiedShift,
      this.selectedShift
    );

    this.selectNewChildCut(copiedShift);

    this.isChangingEvent.emit(true);
  }

  private performCutByTime(): void {
    if (!this.selectedShift) {
      return;
    }

    const copiedShift = cloneObject<Shift>(this.selectedShift);

    this.restoreOwnTimeObjects(copiedShift);

    const originalEndShift = this.selectedShift.endShift;
    const originalInternalEndShift = this.selectedShift.internalEndShift;

    this.selectedShift.endShift = `${this.cutTimeShift.hours
      .toString()
      .padStart(2, '0')}:${this.cutTimeShift.minutes
      .toString()
      .padStart(2, '0')}`;
    this.selectedShift.internalEndShift = OwnTime.forTime(
      this.cutTimeShift.hours,
      this.cutTimeShift.minutes
    );

    const originalStartMinutes =
      this.selectedShift.internalStartShift?.toMinutes() || 0;
    const originalEndMinutes = this.selectedShift.internalEndShift.toMinutes();
    if (
      originalEndMinutes < originalStartMinutes &&
      originalEndMinutes !== originalStartMinutes
    ) {
      this.selectedShift.cuttingAfterMidnight = true;
    } else {
      this.selectedShift.cuttingAfterMidnight = false;
    }

    const cutTimeProps: any = {
      startShift: `${this.cutTimeShift.hours
        .toString()
        .padStart(2, '0')}:${this.cutTimeShift.minutes
        .toString()
        .padStart(2, '0')}`,
      internalStartShift: OwnTime.forTime(
        this.cutTimeShift.hours,
        this.cutTimeShift.minutes
      ),
    };

    if (this.is24Hours) {
      cutTimeProps.endShift = originalEndShift;
      cutTimeProps.internalEndShift = originalInternalEndShift;
    }

    this.prepareCutShift(copiedShift, cutTimeProps);

    this.selectedShift.status = ShiftStatus.IsCut;

    const copiedStartMinutes = copiedShift.internalStartShift.toMinutes();
    const copiedEndMinutes = copiedShift.internalEndShift?.toMinutes() || 0;

    if (
      copiedEndMinutes < copiedStartMinutes &&
      copiedEndMinutes !== copiedStartMinutes
    ) {
      copiedShift.cuttingAfterMidnight = true;
    } else {
      copiedShift.cuttingAfterMidnight = false;
    }

    const parentOriginalStartMinutes =
      this.selectedShift.internalStartShift?.toMinutes() || 0;

    if (
      this.selectedShift.cuttingAfterMidnight &&
      copiedStartMinutes < parentOriginalStartMinutes &&
      copiedShift.fromDate
    ) {
      const adjustedDate = new Date(copiedShift.fromDate);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      copiedShift.fromDate = adjustedDate;
      copiedShift.internalFromDate = transformDateToNgbDateStruct(adjustedDate);
    }

    this.dataManagementShiftCutService.calculateNestedSetValues(
      copiedShift,
      this.selectedShift
    );

    this.dataManagementShiftCutService.addCutShift(copiedShift);

    this.selectNewChildCut(copiedShift);

    this.isChangingEvent.emit(true);
  }

  private performCutByWeekdays(): void {
    if (!this.selectedShift) {
      return;
    }

    const copiedShift = cloneObject<Shift>(this.selectedShift);

    this.restoreOwnTimeObjects(copiedShift);

    this.updateOriginalShiftWeekdays(this.selectedShift);

    this.updateCopiedShiftWeekdays(copiedShift);

    this.prepareCutShift(copiedShift);

    this.selectedShift.status = ShiftStatus.IsCut;

    this.dataManagementShiftCutService.addCutShift(copiedShift);

    this.dataManagementShiftCutService.calculateNestedSetValues(
      copiedShift,
      this.selectedShift
    );

    this.selectNewChildCut(copiedShift);

    this.isChangingEvent.emit(true);
  }

  private updateOriginalShiftWeekdays(originalShift: Shift): void {
    if (this.weekdays.isMonday) originalShift.isMonday = false;
    if (this.weekdays.isTuesday) originalShift.isTuesday = false;
    if (this.weekdays.isWednesday) originalShift.isWednesday = false;
    if (this.weekdays.isThursday) originalShift.isThursday = false;
    if (this.weekdays.isFriday) originalShift.isFriday = false;
    if (this.weekdays.isSaturday) originalShift.isSaturday = false;
    if (this.weekdays.isSunday) originalShift.isSunday = false;
    if (this.weekdays.isHoliday) originalShift.isHoliday = false;
    if (this.weekdays.isWeekdayOrHoliday)
      originalShift.isWeekdayOrHoliday = false;
  }

  private updateCopiedShiftWeekdays(copiedShift: Shift): void {
    copiedShift.isMonday = this.weekdays.isMonday;
    copiedShift.isTuesday = this.weekdays.isTuesday;
    copiedShift.isWednesday = this.weekdays.isWednesday;
    copiedShift.isThursday = this.weekdays.isThursday;
    copiedShift.isFriday = this.weekdays.isFriday;
    copiedShift.isSaturday = this.weekdays.isSaturday;
    copiedShift.isSunday = this.weekdays.isSunday;
    copiedShift.isHoliday = this.weekdays.isHoliday;
    copiedShift.isWeekdayOrHoliday = this.weekdays.isWeekdayOrHoliday;
  }

  private performCutByStaff(): void {
    if (!this.selectedShift) {
      return;
    }

    const copiedShift = cloneObject<Shift>(this.selectedShift);

    this.restoreOwnTimeObjects(copiedShift);

    const originalStaffCount =
      this.selectedShift.sumEmployees - this.staffCount;
    const copiedStaffCount = this.staffCount;

    this.selectedShift.sumEmployees = originalStaffCount;

    this.prepareCutShift(copiedShift, {
      sumEmployees: copiedStaffCount,
    });

    this.selectedShift.status = ShiftStatus.IsCut;

    this.dataManagementShiftCutService.addCutShift(copiedShift);

    this.dataManagementShiftCutService.calculateNestedSetValues(
      copiedShift,
      this.selectedShift
    );

    this.selectNewChildCut(copiedShift);

    this.isChangingEvent.emit(true);
  }

  private performCutByTask(): void {
    if (!this.selectedShift) {
      return;
    }

    const copiedShift = cloneObject<Shift>(this.selectedShift);

    const originalTaskCount = this.selectedShift.quantity - this.taskCount;
    const copiedTaskCount = this.taskCount;

    this.selectedShift.quantity = originalTaskCount;

    this.prepareCutShift(copiedShift, {
      quantity: copiedTaskCount,
    });

    this.selectedShift.status = ShiftStatus.IsCut;

    this.dataManagementShiftCutService.addCutShift(copiedShift);

    this.dataManagementShiftCutService.calculateNestedSetValues(
      copiedShift,
      this.selectedShift
    );

    this.selectNewChildCut(copiedShift);

    this.isChangingEvent.emit(true);
  }

  private restoreOwnTimeObjects(shift: Shift): void {
    if (shift.startShift) {
      shift.internalStartShift = transformStringToOwnTimeStruct(
        shift.startShift
      );
    }
    if (shift.endShift) {
      shift.internalEndShift = transformStringToOwnTimeStruct(shift.endShift);
    }
    if (shift.beforeShift) {
      shift.internalBeforeShift = transformStringToOwnTimeStruct(
        shift.beforeShift
      );
    }
    if (shift.afterShift) {
      shift.internalAfterShift = transformStringToOwnTimeStruct(
        shift.afterShift
      );
    }
    if (shift.travelTimeBefore) {
      shift.internalTravelTimeBefore = transformStringToOwnTimeStruct(
        shift.travelTimeBefore
      );
    }
    if (shift.travelTimeAfter) {
      shift.internalTravelTimeAfter = transformStringToOwnTimeStruct(
        shift.travelTimeAfter
      );
    }
    if (shift.briefingTime) {
      shift.internalBriefingTime = transformStringToOwnTimeStruct(
        shift.briefingTime
      );
    }
    if (shift.debriefingTime) {
      shift.internalDebriefingTime = transformStringToOwnTimeStruct(
        shift.debriefingTime
      );
    }
    if (shift.workTime !== undefined && shift.workTime !== null) {
      const hours = Math.floor(shift.workTime / 60);
      const minutes = shift.workTime % 60;
      shift.internalWorkTime = transformStringToOwnTimeStruct(
        `${hours}:${minutes}`,
        true
      );
    }
  }

  private selectNewChildCut(newChildCut: Shift): void {
    this.selectedShift = newChildCut;
    if (newChildCut) {
      this.analyzeCutByDate(newChildCut);
      this.analyzeCutByTime(newChildCut);
      this.analyzeCutByWeekdays(newChildCut);
      this.analyzeCutByStaff(newChildCut);
      this.analyzeCutByTask(newChildCut);
    }
  }

  private prepareCutShift(copiedShift: Shift, specificProperties?: any): void {
    if (!this.selectedShift) {
      return;
    }

    copiedShift.id = newGuid();
    copiedShift.parentId = this.selectedShift.id;
    copiedShift.rootId = this.selectedShift.rootId || this.selectedShift.id;
    copiedShift.isNew = true;

    if (this.selectedShift.cuttingAfterMidnight) {
      copiedShift.cuttingAfterMidnight = true;
    }

    if (specificProperties) {
      Object.assign(copiedShift, specificProperties);
    }
  }

  private resetAllParameters(): void {
    this.cutDate = null;

    this.cutTimeShift = OwnTime.forTime();
    this.minTimeShift = null;
    this.maxTimeShift = null;
    this.isOverMidnight = false;
    this.is24Hours = false;

    this.weekdays = {
      isMonday: false,
      isTuesday: false,
      isWednesday: false,
      isThursday: false,
      isFriday: false,
      isSaturday: false,
      isSunday: false,
      isHoliday: false,
      isWeekdayOrHoliday: false,
    };

    this.staffCount = 0;
    this.taskCount = 0;

    this.isCutDateEnabled = false;
    this.isCutTimeEnabled = false;
    this.isCutWeekdaysEnabled = false;
    this.isCutStaffEnabled = false;
    this.isCutTaskEnabled = false;

    this.isMondayEnabled = false;
    this.isTuesdayEnabled = false;
    this.isWednesdayEnabled = false;
    this.isThursdayEnabled = false;
    this.isFridayEnabled = false;
    this.isSaturdayEnabled = false;
    this.isSundayEnabled = false;
    this.isHolidayEnabled = false;
    this.isWeekdayOrHolidayEnabled = false;
  }
}
