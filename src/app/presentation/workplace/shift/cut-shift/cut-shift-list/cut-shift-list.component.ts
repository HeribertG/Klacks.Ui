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
  HostListener,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  NgbModal,
  NgbCalendar,
  NgbDate,
  NgbDateStruct,
  NgbDatepickerModule,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { faCalendar, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { CutTableComponent } from '../cut-table/cut-table.component';
import { IShift, Shift, ShiftStatus } from 'src/app/domain/models/shift-class';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { transformStringToOwnTimeStruct } from 'src/app/domain/helpers/own-time.helper';
import { newGuid } from 'src/app/shared/helpers/guid.helper';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { ShiftCutOperationService } from 'src/app/domain/services/shift/shift-cut-operation.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/data-shift-cuts.service';

@Component({
  selector: 'app-cut-shift-list',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbDatepickerModule,
    FontAwesomeModule,
    CutTableComponent
],
  templateUrl: './cut-shift-list.component.html',
  styleUrl: './cut-shift-list.component.scss',
})
export class CutShiftListComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementShiftCutService = inject(DataManagementShiftCutService);
  private dataShiftCutsService = inject(DataShiftCutsService);
  private shiftCutOperationService = inject(ShiftCutOperationService);
  private workTimeCalculator = inject(WorkTimeCalculationService);
  private modalService = inject(NgbModal);
  private calendar = inject(NgbCalendar);

  @ViewChild('cutDateModal', { static: true }) cutDateModal!: TemplateRef<any>;
  @ViewChild('cutTimeModal', { static: true }) cutTimeModal!: TemplateRef<any>;
  @ViewChild('cutWeekdaysModal', { static: true })
  cutWeekdaysModal!: TemplateRef<any>;
  @ViewChild('cutStaffModal', { static: true })
  cutStaffModal!: TemplateRef<any>;
  @ViewChild('cutTaskModal', { static: true }) cutTaskModal!: TemplateRef<any>;
  @ViewChild('resetCutsModal', { static: true })
  resetCutsModal!: TemplateRef<any>;

  cutDate: NgbDateStruct | null = null;
  resetDate: NgbDateStruct | null = null;
  minDate!: NgbDate;
  maxDate!: NgbDate;
  faCalendar = faCalendar;
  faRotateLeft = faRotateLeft;
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
  public isResetCutsEnabled = false;

  @Input() shifts: IShift[] = [];

  public selectedShift: Shift | undefined = undefined;
  private activeModal: NgbModalRef | null = null;

  ngOnInit(): void {
    this.resetAllParameters();
    this.dataManagementShiftCutService.onResetCompleted = () => {
      this.analyzeResetCuts();
    };
    this.dataManagementShiftCutService.onReadCompleted = () => {
      this.analyzeResetCuts();
    };
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.activeModal) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.activeModal.close();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.activeModal.dismiss();
    }
  }

  selectAllText(event: FocusEvent): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      inputElement.setSelectionRange(0, inputElement.value.length);
      inputElement.select();
    }
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

    this.activeModal = this.modalService.open(this.cutDateModal, {
      size: 'sm',
      centered: true,
      windowClass: 'modal-window',
    });

    this.activeModal.result.then(
      () => {
        this.performCutByDate();
        this.activeModal = null;
      },
      () => {
        this.activeModal = null;
      }
    );
  }

  onCutTime(): void {
    if (!this.isCutTimeEnabled) {
      return;
    }
    this.activeModal = this.modalService.open(this.cutTimeModal, {
      size: 'sm',
      centered: true,
      windowClass: 'modal-window',
    });

    this.activeModal.result.then(
      () => {
        this.performCutByTime();
        this.activeModal = null;
      },
      () => {
        this.activeModal = null;
      }
    );
  }

  onCutWeekdays(): void {
    this.activeModal = this.modalService.open(this.cutWeekdaysModal, {
      size: 'md',
      centered: true,
      windowClass: 'modal-window',
    });

    this.activeModal.result.then(
      () => {
        this.performCutByWeekdays();
        this.activeModal = null;
      },
      () => {
        this.activeModal = null;
      }
    );
  }

  onCutStaff(): void {
    this.activeModal = this.modalService.open(this.cutStaffModal, {
      size: 'sm',
      centered: true,
      windowClass: 'modal-window',
    });

    this.activeModal.result.then(
      () => {
        this.performCutByStaff();
        this.activeModal = null;
      },
      () => {
        this.activeModal = null;
      }
    );
  }

  onCutTask(): void {
    this.activeModal = this.modalService.open(this.cutTaskModal, {
      size: 'sm',
      centered: true,
      windowClass: 'modal-window',
    });

    this.activeModal.result.then(
      () => {
        this.performCutByTask();
        this.activeModal = null;
      },
      () => {
        this.activeModal = null;
      }
    );
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
      this.analyzeResetCuts();
    }
  }

  private analyzeResetCuts(): void {
    const hasSplitShifts = this.dataManagementShiftCutService.cutShifts?.some(
      (s) => s.status === ShiftStatus.SplitShift
    ) ?? false;
    const isSaved = !(this.dataManagementShiftCutService.areObjectsDirty?.() ?? false);
    this.isResetCutsEnabled = hasSplitShifts && isSaved;
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
    this.analyzeResetCuts();
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
    let weekdayCount = 0;
    if (shift.isMonday) weekdayCount++;
    if (shift.isTuesday) weekdayCount++;
    if (shift.isWednesday) weekdayCount++;
    if (shift.isThursday) weekdayCount++;
    if (shift.isFriday) weekdayCount++;
    if (shift.isSaturday) weekdayCount++;
    if (shift.isSunday) weekdayCount++;

    if (weekdayCount >= 2) {
      this.isCutWeekdaysEnabled = true;

      this.weekdays.isMonday = false;
      this.weekdays.isTuesday = false;
      this.weekdays.isWednesday = false;
      this.weekdays.isThursday = false;
      this.weekdays.isFriday = false;
      this.weekdays.isSaturday = false;
      this.weekdays.isSunday = false;

      this.isMondayEnabled = shift.isMonday;
      this.isTuesdayEnabled = shift.isTuesday;
      this.isWednesdayEnabled = shift.isWednesday;
      this.isThursdayEnabled = shift.isThursday;
      this.isFridayEnabled = shift.isFriday;
      this.isSaturdayEnabled = shift.isSaturday;
      this.isSundayEnabled = shift.isSunday;
    }
  }

  private analyzeCutByStaff(shift: Shift): void {
    if (shift.sumEmployees && shift.sumEmployees > 1) {
      this.isCutStaffEnabled = true;
      this.minStaffCount = 1;
      this.maxStaffCount = shift.sumEmployees - 1;
      this.staffCount = 1;
    }
  }

  private analyzeCutByTask(shift: Shift): void {
    if (shift.quantity && shift.quantity > 1) {
      this.isCutTaskEnabled = true;
      this.minTaskCount = 1;
      this.maxTaskCount = shift.quantity - 1;
      this.taskCount = 1;
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

    const result = this.shiftCutOperationService.cutByDate({
      selectedShift: this.selectedShift,
      cutDate: cutDateAsDate,
    });

    this.dataManagementShiftCutService.addCutShift(result.newShift);
    this.selectNewChildCut(result.newShift);

    this.isChangingEvent.emit(true);
    this.analyzeResetCuts();
  }

  private performCutByTime(): void {
    if (!this.selectedShift) {
      return;
    }

    const copiedShift = this.copyShift(this.selectedShift);

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
    const originalEndMinutes = originalInternalEndShift?.toMinutes() || 0;

    const crossesMidnight = originalEndMinutes < originalStartMinutes;

    this.selectedShift.cuttingAfterMidnight =
      crossesMidnight &&
      originalStartMinutes >= 0 &&
      originalStartMinutes < originalEndMinutes;

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

    this.selectedShift.status = ShiftStatus.SplitShift;

    this.selectedShift.workTime = this.workTimeCalculator.calculateWorkTime(
      this.selectedShift.internalStartShift,
      this.selectedShift.internalEndShift
    );
    copiedShift.workTime = this.workTimeCalculator.calculateWorkTime(
      copiedShift.internalStartShift,
      copiedShift.internalEndShift
    );

    const copiedStartMinutes = copiedShift.internalStartShift.toMinutes();

    copiedShift.cuttingAfterMidnight =
      crossesMidnight &&
      copiedStartMinutes >= 0 &&
      copiedStartMinutes < originalEndMinutes;

    if (
      copiedShift.cuttingAfterMidnight &&
      copiedShift.fromDate
    ) {
      const adjustedDate = new Date(copiedShift.fromDate);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      copiedShift.fromDate = adjustedDate;
      copiedShift.internalFromDate = transformDateToNgbDateStruct(adjustedDate);
    }

    this.dataManagementShiftCutService.addCutShift(copiedShift);

    this.selectNewChildCut(copiedShift);

    this.isChangingEvent.emit(true);
    this.analyzeResetCuts();
  }

  private performCutByWeekdays(): void {
    if (!this.selectedShift) {
      return;
    }

    const result = this.shiftCutOperationService.cutByWeekdays({
      selectedShift: this.selectedShift,
      weekdays: this.weekdays,
    });

    this.dataManagementShiftCutService.addCutShift(result.newShift);
    this.selectNewChildCut(result.newShift);

    this.isChangingEvent.emit(true);
    this.analyzeResetCuts();
  }

  private updateOriginalShiftWeekdays(originalShift: Shift): void {
    if (this.weekdays.isMonday) originalShift.isMonday = false;
    if (this.weekdays.isTuesday) originalShift.isTuesday = false;
    if (this.weekdays.isWednesday) originalShift.isWednesday = false;
    if (this.weekdays.isThursday) originalShift.isThursday = false;
    if (this.weekdays.isFriday) originalShift.isFriday = false;
    if (this.weekdays.isSaturday) originalShift.isSaturday = false;
    if (this.weekdays.isSunday) originalShift.isSunday = false;
  }

  private updateCopiedShiftWeekdays(copiedShift: Shift): void {
    copiedShift.isMonday = this.weekdays.isMonday;
    copiedShift.isTuesday = this.weekdays.isTuesday;
    copiedShift.isWednesday = this.weekdays.isWednesday;
    copiedShift.isThursday = this.weekdays.isThursday;
    copiedShift.isFriday = this.weekdays.isFriday;
    copiedShift.isSaturday = this.weekdays.isSaturday;
    copiedShift.isSunday = this.weekdays.isSunday;
  }

  private performCutByStaff(): void {
    if (!this.selectedShift) {
      return;
    }

    const result = this.shiftCutOperationService.cutByStaff({
      selectedShift: this.selectedShift,
      staffCount: this.staffCount,
    });

    this.dataManagementShiftCutService.addCutShift(result.newShift);
    this.selectNewChildCut(result.newShift);

    this.isChangingEvent.emit(true);
    this.analyzeResetCuts();
  }

  private performCutByTask(): void {
    if (!this.selectedShift) {
      return;
    }

    const result = this.shiftCutOperationService.cutByTask({
      selectedShift: this.selectedShift,
      taskCount: this.taskCount,
    });

    this.dataManagementShiftCutService.addCutShift(result.newShift);
    this.selectNewChildCut(result.newShift);

    this.isChangingEvent.emit(true);
    this.analyzeResetCuts();
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

    copiedShift.parentId = this.selectedShift.id;
    copiedShift.id = newGuid();
    copiedShift.isNew = true;

    if (this.selectedShift.cuttingAfterMidnight) {
      copiedShift.cuttingAfterMidnight = true;
    }

    if (specificProperties) {
      Object.assign(copiedShift, specificProperties);
    }
  }

  onResetCuts(): void {
    const firstShift = this.dataManagementShiftCutService.cutShifts[0];

    if (!firstShift || !firstShift.originalId) {
      return;
    }

    this.dataShiftCutsService.getResetDateRange(firstShift.originalId).subscribe({
      next: (response) => {
        const earliestDate = new Date(response.earliestResetDate);
        const earliestNgbDate = this.calendar.getNext(
          new NgbDate(
            earliestDate.getFullYear(),
            earliestDate.getMonth() + 1,
            earliestDate.getDate()
          ),
          'd',
          0
        );
        this.minDate = earliestNgbDate;

        if (response.untilDate) {
          const untilDate = new Date(response.untilDate);
          const untilNgbDate = new NgbDate(
            untilDate.getFullYear(),
            untilDate.getMonth() + 1,
            untilDate.getDate()
          );
          this.maxDate = untilNgbDate;
        } else {
          this.maxDate = this.calendar.getNext(earliestNgbDate, 'y', 1);
        }

        const today = new Date();
        const todayNgbDate = new NgbDate(
          today.getFullYear(),
          today.getMonth() + 1,
          today.getDate()
        );

        const todayCompare = todayNgbDate.after(this.minDate) || todayNgbDate.equals(this.minDate);
        const todayInRange = todayCompare && (todayNgbDate.before(this.maxDate) || todayNgbDate.equals(this.maxDate));

        if (todayInRange) {
          this.resetDate = todayNgbDate;
        } else if (todayNgbDate.before(this.minDate)) {
          this.resetDate = this.minDate;
        } else {
          this.resetDate = this.maxDate;
        }

        this.activeModal = this.modalService.open(this.resetCutsModal, {
          size: 'md',
          centered: true,
          windowClass: 'modal-window',
        });

        this.activeModal.result.then(
          () => {
            this.performResetCuts();
            this.activeModal = null;
          },
          () => {
            this.activeModal = null;
          }
        );
      },
      error: (error) => {
        console.error('Error fetching reset date range:', error);
      },
    });
  }

  private performResetCuts(): void {
    if (!this.resetDate) {
      return;
    }

    const newStartDate = transformNgbDateStructToDate(this.resetDate);
    if (!newStartDate) {
      return;
    }

    const firstShift = this.dataManagementShiftCutService.cutShifts[0];

    if (!firstShift || !firstShift.originalId) {
      return;
    }

    this.dataManagementShiftCutService.resetCuts(
      firstShift.originalId,
      newStartDate
    );
    this.resetDate = null;
  }

  private resetAllParameters(): void {
    this.cutDate = null;
    this.resetDate = null;

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
    };

    this.staffCount = 1;
    this.minStaffCount = 1;
    this.maxStaffCount = 100;

    this.taskCount = 1;
    this.minTaskCount = 1;
    this.maxTaskCount = 50;

    this.isCutDateEnabled = false;
    this.isCutTimeEnabled = false;
    this.isCutWeekdaysEnabled = false;
    this.isCutStaffEnabled = false;
    this.isCutTaskEnabled = false;
    this.isResetCutsEnabled = false;

    this.isMondayEnabled = false;
    this.isTuesdayEnabled = false;
    this.isWednesdayEnabled = false;
    this.isThursdayEnabled = false;
    this.isFridayEnabled = false;
    this.isSaturdayEnabled = false;
    this.isSundayEnabled = false;
  }

  private copyShift(shift: Shift): Shift {
    const value = cloneObject<Shift>(shift);
    if (value) {
      if (value.fromDate) {
        value.internalFromDate = transformDateToNgbDateStruct(value.fromDate);
      }

      if (value.untilDate) {
        value.internalUntilDate = transformDateToNgbDateStruct(value.untilDate);
      }
    }
    return value;
  }
}
