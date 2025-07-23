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
import { IShift, Shift } from 'src/app/core/shift-class';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import {
  transformStringToOwnTimeStruct,
  transformDateToNgbDateStruct,
} from 'src/app/helpers/format-helper';

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

  public dataManagementShiftService = inject(DataManagementShiftService);
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
      return;
    }

    if (this.isOverMidnight) {
      if (currentMinutes < minMinutes && currentMinutes > maxMinutes) {
        const distanceToMin = minMinutes - currentMinutes;
        const distanceToMax = currentMinutes - maxMinutes;

        if (distanceToMin <= distanceToMax) {
          this.cutTimeShift.hours = this.minTimeShift.hours;
          this.cutTimeShift.minutes = this.minTimeShift.minutes;
        } else {
          this.cutTimeShift.hours = this.maxTimeShift.hours;
          this.cutTimeShift.minutes = this.maxTimeShift.minutes;
        }
      }
    } else {
      if (currentMinutes < minMinutes) {
        this.cutTimeShift.hours = this.minTimeShift.hours;
        this.cutTimeShift.minutes = this.minTimeShift.minutes;
      } else if (currentMinutes > maxMinutes) {
        this.cutTimeShift.hours = this.maxTimeShift.hours;
        this.cutTimeShift.minutes = this.maxTimeShift.minutes;
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
      .result.then(
        () => {
          console.log('Cut by date confirmed');
          // TODO: Implement cut by date functionality
        },
        () => {
          console.log('Cut by date cancelled');
        }
      );
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
        console.log('Cut by time confirmed');
        // TODO: Implement cut by time functionality
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
        console.log('Cut by weekdays confirmed');
        // TODO: Implement cut by weekdays functionality
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
        console.log('Cut by staff confirmed');
        // TODO: Implement cut by staff functionality
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
        console.log('Cut by task confirmed');
        // TODO: Implement cut by task functionality
      });
  }

  onTableRowClicked(shift: Shift): void {
    this.resetAllParameters();

    if (shift) {
      this.analyzeCutByDate(shift);
      this.analyzeCutByTime(shift);
      this.analyzeCutByWeekdays(shift);
      this.analyzeCutByStaff(shift);
      this.analyzeCutByTask(shift);
    }
  }

  onCellUpdated(event: { shift: Shift; field: string; value: string }): void {
    // Update the shift object with the new value
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

    // TODO: Here you can add service call to save the changes to backend
    console.log(
      `Updated ${event.field} to "${event.value}" for shift:`,
      event.shift
    );

    // Optionally emit an event or call a service to persist the changes
    // this.dataManagementShiftService.updateShift(event.shift);
  }

  private analyzeCutByDate(shift: Shift): void {
    if (shift.fromDate || shift.untilDate) {
      this.isCutDateEnabled = true;

      if (shift.fromDate) {
        const ngbFromDate = transformDateToNgbDateStruct(shift.fromDate);

        if (ngbFromDate) {
          const fromDate = NgbDate.from(ngbFromDate);
          if (fromDate) {
            this.minDate = fromDate;
            this.cutDate = fromDate;
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
        if (shift.fromDate && this.minDate) {
          this.maxDate = this.calendar.getNext(this.minDate, 'y', 1);
        }
      }
    }
  }

  private analyzeCutByTime(shift: Shift): void {
    shift.internalStartShift = transformStringToOwnTimeStruct(shift.startShift);
    shift.internalEndShift = transformStringToOwnTimeStruct(shift.endShift);

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

        this.cutTimeShift = OwnTime.forTime(
          shift.internalStartShift.hours,
          shift.internalStartShift.minutes
        );
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

    // Holiday and WeekdayOrHoliday are mutually exclusive
    if (shift.isHoliday && !shift.isWeekdayOrHoliday) selectedCount++;
    if (shift.isWeekdayOrHoliday && !shift.isHoliday) selectedCount++;

    // Enable cut weekdays only if at least 2 options are selected
    if (selectedCount >= 2) {
      this.isCutWeekdaysEnabled = true;

      // Set weekday values from shift
      this.weekdays.isMonday = shift.isMonday;
      this.weekdays.isTuesday = shift.isTuesday;
      this.weekdays.isWednesday = shift.isWednesday;
      this.weekdays.isThursday = shift.isThursday;
      this.weekdays.isFriday = shift.isFriday;
      this.weekdays.isSaturday = shift.isSaturday;
      this.weekdays.isSunday = shift.isSunday;

      // Handle mutual exclusivity of holiday and weekdayOrHoliday
      if (shift.isHoliday && shift.isWeekdayOrHoliday) {
        // If both are set in the shift, prefer weekdayOrHoliday
        this.weekdays.isHoliday = false;
        this.weekdays.isWeekdayOrHoliday = true;
      } else {
        this.weekdays.isHoliday = shift.isHoliday;
        this.weekdays.isWeekdayOrHoliday = shift.isWeekdayOrHoliday;
      }

      // Enable corresponding weekday checkboxes
      this.isMondayEnabled = shift.isMonday;
      this.isTuesdayEnabled = shift.isTuesday;
      this.isWednesdayEnabled = shift.isWednesday;
      this.isThursdayEnabled = shift.isThursday;
      this.isFridayEnabled = shift.isFriday;
      this.isSaturdayEnabled = shift.isSaturday;
      this.isSundayEnabled = shift.isSunday;

      // Enable holiday/weekdayOrHoliday based on mutual exclusivity
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
