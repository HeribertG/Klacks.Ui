import { Component, ViewChild, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal, NgbCalendar, NgbDate, NgbDatepicker } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-cut-shift-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgbDatepicker],
  templateUrl: './cut-shift-list.component.html',
  styleUrl: './cut-shift-list.component.scss'
})
export class CutShiftListComponent {
  private modalService = inject(NgbModal);
  private calendar = inject(NgbCalendar);

  @ViewChild('cutDateModal', { static: true }) cutDateModal!: TemplateRef<any>;
  @ViewChild('cutTimeModal', { static: true }) cutTimeModal!: TemplateRef<any>;
  @ViewChild('cutWeekdaysModal', { static: true }) cutWeekdaysModal!: TemplateRef<any>;
  @ViewChild('cutStaffModal', { static: true }) cutStaffModal!: TemplateRef<any>;
  @ViewChild('cutTaskModal', { static: true }) cutTaskModal!: TemplateRef<any>;

  // Cut Date properties
  cutDate: NgbDate | null = null;
  minDate: NgbDate;
  maxDate: NgbDate;

  // Cut Time properties
  startTime = { hours: 0, minutes: 0 };
  endTime = { hours: 0, minutes: 0 };
  workTime = { hours: 0, minutes: 0 };

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
    isWeekdayOrHoliday: false
  };

  // Cut Staff and Task properties
  staffCount: number = 1;
  taskCount: number = 1;
  minStaffCount: number = 1;
  maxStaffCount: number = 100;
  minTaskCount: number = 1;
  maxTaskCount: number = 50;

  constructor() {
    // Set default date range (today to 1 year from now)
    this.minDate = this.calendar.getToday();
    this.maxDate = this.calendar.getNext(this.calendar.getToday(), 'y', 1);
  }
  onCutDate(): void {
    this.modalService
      .open(this.cutDateModal, {
        size: 'md',
        centered: true,
        windowClass: 'modal-window'
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
    this.modalService
      .open(this.cutTimeModal, {
        size: 'md',
        centered: true,
        windowClass: 'modal-window'
      })
      .result.then(
        () => {
          console.log('Cut by time confirmed');
          // TODO: Implement cut by time functionality
        },
        () => {
          console.log('Cut by time cancelled');
        }
      );
  }

  onCutWeekdays(): void {
    this.modalService
      .open(this.cutWeekdaysModal, {
        size: 'md',
        centered: true,
        windowClass: 'modal-window'
      })
      .result.then(
        () => {
          console.log('Cut by weekdays confirmed');
          // TODO: Implement cut by weekdays functionality
        },
        () => {
          console.log('Cut by weekdays cancelled');
        }
      );
  }

  onCutStaff(): void {
    this.modalService
      .open(this.cutStaffModal, {
        size: 'md',
        centered: true,
        windowClass: 'modal-window'
      })
      .result.then(
        () => {
          console.log('Cut by staff confirmed');
          // TODO: Implement cut by staff functionality
        },
        () => {
          console.log('Cut by staff cancelled');
        }
      );
  }

  onCutTask(): void {
    this.modalService
      .open(this.cutTaskModal, {
        size: 'md',
        centered: true,
        windowClass: 'modal-window'
      })
      .result.then(
        () => {
          console.log('Cut by task confirmed');
          // TODO: Implement cut by task functionality
        },
        () => {
          console.log('Cut by task cancelled');
        }
      );
  }
}
