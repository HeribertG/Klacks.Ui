// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Component for displaying and controlling shift cut operations (date, time, weekdays, staff, tasks).
 * Coordinates the cut services and manages lifecycle, template bindings, and modals.
 * @param shifts - List of shifts to display
 * @param isChangingEvent - Event emitted on changes
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  TemplateRef,
  inject,
  Input,
  OnInit,
  HostListener,
  DestroyRef,
  computed,
  input,
  output,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { CutTableComponent } from '../cut-table/cut-table.component';
import { IShift, Shift, ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { ShiftCutOperationService } from 'src/app/domain/services/shift/shift-cut-operation.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/shift/data-shift-cuts.service';
import { CutByTimeService } from './services/cut-by-time.service';
import { CutByDateService } from './services/cut-by-date.service';
import { CutByWeekdayService } from './services/cut-by-weekday.service';
import { CutByStaffService } from './services/cut-by-staff.service';
import { createDefaultCutParameterState } from './services/cut-parameter-state';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CutShiftListComponent implements OnInit {
  readonly isChangingEvent = output<boolean>();

  public dataManagementShiftCutService = inject(DataManagementShiftCutService);
  private dataShiftCutsService = inject(DataShiftCutsService);
  private shiftCutOperationService = inject(ShiftCutOperationService);
  protected analyseScenarioService = inject(AnalyseScenarioService);
  private translateService = inject(TranslateService);
  private modalService = inject(NgbModal);
  private calendar = inject(NgbCalendar);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  protected scenarioBlockedTitle = computed(() =>
    this.analyseScenarioService.isScenarioMode()
      ? this.translateService.instant('scenario.shiftEditBlocked')
      : ''
  );

  private cutByTimeService = inject(CutByTimeService);
  private cutByDateService = inject(CutByDateService);
  private cutByWeekdayService = inject(CutByWeekdayService);
  private cutByStaffService = inject(CutByStaffService);

  readonly cutDateModal = viewChild.required<TemplateRef<any>>('cutDateModal');
  readonly cutTimeModal = viewChild.required<TemplateRef<any>>('cutTimeModal');
  readonly cutWeekdaysModal = viewChild.required<TemplateRef<any>>('cutWeekdaysModal');
  readonly cutStaffModal = viewChild.required<TemplateRef<any>>('cutStaffModal');
  readonly cutTaskModal = viewChild.required<TemplateRef<any>>('cutTaskModal');
  readonly resetCutsModal = viewChild.required<TemplateRef<any>>('resetCutsModal');

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

  readonly shifts = input<IShift[]>([]);

  public selectedShift: Shift | undefined = undefined;
  private activeModal: NgbModalRef | null = null;

  ngOnInit(): void {
    this.resetAllParameters();
    this.dataManagementShiftCutService.onResetCompleted = () => {
      this.analyzeResetCuts();
      this.cdr.markForCheck();
    };
    this.dataManagementShiftCutService.onReadCompleted = () => {
      this.analyzeResetCuts();
      this.cdr.markForCheck();
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
    this.cutByTimeService.validateAndCorrectTime({
      cutTimeShift: this.cutTimeShift,
      minTimeShift: this.minTimeShift,
      maxTimeShift: this.maxTimeShift,
      isOverMidnight: this.isOverMidnight,
      is24Hours: this.is24Hours,
    });
  }

  onCutDate(): void {
    if (!this.isCutDateEnabled) {
      return;
    }

    this.activeModal = this.modalService.open(this.cutDateModal(), {
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
    this.activeModal = this.modalService.open(this.cutTimeModal(), {
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
    this.activeModal = this.modalService.open(this.cutWeekdaysModal(), {
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
    this.activeModal = this.modalService.open(this.cutStaffModal(), {
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
    this.activeModal = this.modalService.open(this.cutTaskModal(), {
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
      this.analyzeShift(shift);
    }
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  private analyzeShift(shift: Shift): void {
    const dateParams = this.cutByDateService.analyzeCutByDate(shift);
    if (dateParams.minDate || dateParams.maxDate) {
      this.isCutDateEnabled = true;
      this.cutDate = dateParams.cutDate;
      if (dateParams.minDate) {
        this.minDate = dateParams.minDate;
      }
      if (dateParams.maxDate) {
        this.maxDate = dateParams.maxDate;
      }
    }

    const timeParams = this.cutByTimeService.analyzeCutByTime(shift);
    if (timeParams.minTimeShift && timeParams.maxTimeShift) {
      this.isCutTimeEnabled = true;
      this.cutTimeShift = timeParams.cutTimeShift;
      this.minTimeShift = timeParams.minTimeShift;
      this.maxTimeShift = timeParams.maxTimeShift;
      this.isOverMidnight = timeParams.isOverMidnight;
      this.is24Hours = timeParams.is24Hours;
    }

    const weekdayParams = this.cutByWeekdayService.analyzeCutByWeekdays(shift);
    if (weekdayParams.isMondayEnabled || weekdayParams.isTuesdayEnabled ||
        weekdayParams.isWednesdayEnabled || weekdayParams.isThursdayEnabled ||
        weekdayParams.isFridayEnabled || weekdayParams.isSaturdayEnabled ||
        weekdayParams.isSundayEnabled) {
      this.isCutWeekdaysEnabled = true;
      this.weekdays = weekdayParams.weekdays;
      this.isMondayEnabled = weekdayParams.isMondayEnabled;
      this.isTuesdayEnabled = weekdayParams.isTuesdayEnabled;
      this.isWednesdayEnabled = weekdayParams.isWednesdayEnabled;
      this.isThursdayEnabled = weekdayParams.isThursdayEnabled;
      this.isFridayEnabled = weekdayParams.isFridayEnabled;
      this.isSaturdayEnabled = weekdayParams.isSaturdayEnabled;
      this.isSundayEnabled = weekdayParams.isSundayEnabled;
    }

    if (this.cutByStaffService.isStaffCutEnabled(shift)) {
      this.isCutStaffEnabled = true;
      const staffParams = this.cutByStaffService.analyzeCutByStaff(shift);
      this.staffCount = staffParams.staffCount;
      this.minStaffCount = staffParams.minStaffCount;
      this.maxStaffCount = staffParams.maxStaffCount;
    }

    if (this.cutByStaffService.isTaskCutEnabled(shift)) {
      this.isCutTaskEnabled = true;
      const taskParams = this.cutByStaffService.analyzeCutByTask(shift);
      this.taskCount = taskParams.taskCount;
      this.minTaskCount = taskParams.minTaskCount;
      this.maxTaskCount = taskParams.maxTaskCount;
    }

    this.analyzeResetCuts();
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
    this.cdr.markForCheck();
  }

  private performCutByTime(): void {
    if (!this.selectedShift) {
      return;
    }

    const copiedShift = this.cutByTimeService.performCutByTime(
      this.selectedShift,
      this.cutTimeShift,
      this.is24Hours
    );

    this.dataManagementShiftCutService.addCutShift(copiedShift);
    this.selectNewChildCut(copiedShift);

    this.isChangingEvent.emit(true);
    this.analyzeResetCuts();
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  private selectNewChildCut(newChildCut: Shift): void {
    this.selectedShift = newChildCut;
    if (newChildCut) {
      this.analyzeShift(newChildCut);
    }
  }

  onResetCuts(): void {
    const firstShift = this.dataManagementShiftCutService.cutShifts[0];

    if (!firstShift || !firstShift.originalId) {
      return;
    }

    this.dataShiftCutsService.getResetDateRange(firstShift.originalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

          this.cdr.markForCheck();

          this.activeModal = this.modalService.open(this.resetCutsModal(), {
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
    const defaults = createDefaultCutParameterState();

    this.cutDate = defaults.date.cutDate;
    this.resetDate = defaults.date.resetDate;

    this.cutTimeShift = defaults.time.cutTimeShift;
    this.minTimeShift = defaults.time.minTimeShift;
    this.maxTimeShift = defaults.time.maxTimeShift;
    this.isOverMidnight = defaults.time.isOverMidnight;
    this.is24Hours = defaults.time.is24Hours;

    this.weekdays = defaults.weekdays.weekdays;

    this.staffCount = defaults.staff.staffCount;
    this.minStaffCount = defaults.staff.minStaffCount;
    this.maxStaffCount = defaults.staff.maxStaffCount;

    this.taskCount = defaults.task.taskCount;
    this.minTaskCount = defaults.task.minTaskCount;
    this.maxTaskCount = defaults.task.maxTaskCount;

    this.isCutDateEnabled = defaults.enabled.isCutDateEnabled;
    this.isCutTimeEnabled = defaults.enabled.isCutTimeEnabled;
    this.isCutWeekdaysEnabled = defaults.enabled.isCutWeekdaysEnabled;
    this.isCutStaffEnabled = defaults.enabled.isCutStaffEnabled;
    this.isCutTaskEnabled = defaults.enabled.isCutTaskEnabled;
    this.isResetCutsEnabled = defaults.enabled.isResetCutsEnabled;

    this.isMondayEnabled = defaults.weekdays.isMondayEnabled;
    this.isTuesdayEnabled = defaults.weekdays.isTuesdayEnabled;
    this.isWednesdayEnabled = defaults.weekdays.isWednesdayEnabled;
    this.isThursdayEnabled = defaults.weekdays.isThursdayEnabled;
    this.isFridayEnabled = defaults.weekdays.isFridayEnabled;
    this.isSaturdayEnabled = defaults.weekdays.isSaturdayEnabled;
    this.isSundayEnabled = defaults.weekdays.isSundayEnabled;
  }
}
