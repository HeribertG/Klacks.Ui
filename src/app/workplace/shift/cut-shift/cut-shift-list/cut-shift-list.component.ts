/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ViewChild,
  TemplateRef,
  inject,
  Input,
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

@Component({
  selector: 'app-cut-shift-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbDatepickerModule,
    FontAwesomeModule,
  ],
  templateUrl: './cut-shift-list.component.html',
  styleUrl: './cut-shift-list.component.scss',
})
export class CutShiftListComponent {
  private modalService = inject(NgbModal);
  private calendar = inject(NgbCalendar);

  @ViewChild('cutDateModal', { static: true }) cutDateModal!: TemplateRef<any>;
  @ViewChild('cutTimeModal', { static: true }) cutTimeModal!: TemplateRef<any>;
  @ViewChild('cutWeekdaysModal', { static: true })
  cutWeekdaysModal!: TemplateRef<any>;
  @ViewChild('cutStaffModal', { static: true })
  cutStaffModal!: TemplateRef<any>;
  @ViewChild('cutTaskModal', { static: true }) cutTaskModal!: TemplateRef<any>;

  // Cut Date properties
  cutDate: NgbDate | null = null;
  minDate: NgbDate;
  maxDate: NgbDate;
  faCalendar = faCalendar;

  // Cut Time properties (similar to dataManagementShiftService.editShift structure)
  cutTimeShift = OwnTime.forTime();

  // Cut Weekdays properties
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

  // Cut Staff and Task properties
  staffCount = 1;
  taskCount = 1;
  minStaffCount = 1;
  maxStaffCount = 100;
  minTaskCount = 1;
  maxTaskCount = 50;

  // Button enabled/disabled state properties
  @Input() isCutDateEnabled = true;
  @Input() isCutTimeEnabled = true;
  @Input() isCutWeekdaysEnabled = true;
  @Input() isCutStaffEnabled = true;
  @Input() isCutTaskEnabled = false;

  // Weekday checkboxes enabled/disabled state properties
  @Input() isMondayEnabled = true;
  @Input() isTuesdayEnabled = true;
  @Input() isWednesdayEnabled = true;
  @Input() isThursdayEnabled = true;
  @Input() isFridayEnabled = true;
  @Input() isSaturdayEnabled = false;
  @Input() isSundayEnabled = false;
  @Input() isHolidayEnabled = true;
  @Input() isWeekdayOrHolidayEnabled = true;
  constructor() {
    // Set default date range (today to 1 year from now)
    this.minDate = this.calendar.getToday();
    this.maxDate = this.calendar.getNext(this.calendar.getToday(), 'y', 1);
  }

  onKeyUpInput(event: any, value: string): void {
    // Handle keyup events for time input validation
  }

  OnChangeTime(): void {
    // Handle time change events and recalculations
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
}
