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

  private selectedShift: Shift | null = null;

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
      // Bei 24h-Shift: Jede Zeit ist erlaubt außer der exakten Startzeit
      if (currentMinutes === minMinutes) {
        const newMinutes = (currentMinutes + 1) % (24 * 60);
        this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        this.cutTimeShift.minutes = (newMinutes % 60).toString();
      }
      return;
    }

    if (this.isOverMidnight) {
      // Bei Over-Midnight: gültige Zeit ist AUSSERHALB von endMinutes bis startMinutes
      // Für 15:00-07:00: ungültig ist 07:01-14:59, gültig ist 15:00-07:00
      const isInvalidRange = currentMinutes > maxMinutes && currentMinutes < minMinutes;
      
      if (isInvalidRange) {
        // Springe zum nächstgelegenen gültigen Wert
        const distanceToStart = Math.abs(minMinutes - currentMinutes);
        const distanceToEnd = Math.abs(currentMinutes - maxMinutes);

        if (distanceToStart <= distanceToEnd) {
          // Näher zum Start, springe zum Start + 1 Minute
          const newMinutes = (minMinutes + 1) % (24 * 60);
          this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
          this.cutTimeShift.minutes = (newMinutes % 60).toString();
        } else {
          // Näher zum End, springe zum End - 1 Minute
          let newMinutes = maxMinutes - 1;
          if (newMinutes < 0) newMinutes = 24 * 60 - 1;
          this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
          this.cutTimeShift.minutes = (newMinutes % 60).toString();
        }
      }
      
      // Zusätzliche Prüfung: darf nicht exakt Start- oder Endzeit sein
      if (currentMinutes === minMinutes) {
        const newMinutes = (minMinutes + 1) % (24 * 60);
        this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        this.cutTimeShift.minutes = (newMinutes % 60).toString();
      }
      if (currentMinutes === maxMinutes) {
        let newMinutes = maxMinutes - 1;
        if (newMinutes < 0) newMinutes = 24 * 60 - 1;
        this.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        this.cutTimeShift.minutes = (newMinutes % 60).toString();
      }
    } else {
      // Normaler Shift: Zeit muss zwischen min und max liegen
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
      .result.then(
        () => {
          console.log('Cut by date confirmed');
          this.performCutByDate();
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
        console.log('Cut by weekdays confirmed');
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
        console.log('Cut by staff confirmed');
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
        console.log('Cut by task confirmed');
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

        // Setze cutTimeShift auf einen Wert zwischen Start und End, nicht auf Start
        if (this.is24Hours) {
          // Bei 24h-Shift: setze auf Startzeit + 1 Stunde als Default
          const defaultCutHour = (Number(shift.internalStartShift.hours) + 1) % 24;
          this.cutTimeShift = OwnTime.forTime(defaultCutHour.toString(), '0');
        } else if (this.isOverMidnight) {
          // Bei Over-Midnight: setze auf Mitte der gültigen Zeitspanne
          const midMinutes = startMinutes + Math.floor(totalMinutes / 2);
          let midHours: number;
          let remainingMinutes: number;
          
          if (midMinutes >= 24 * 60) {
            // Wenn wir über Mitternacht gehen, ziehe 24h ab
            const adjustedMinutes = midMinutes - 24 * 60;
            midHours = Math.floor(adjustedMinutes / 60);
            remainingMinutes = adjustedMinutes % 60;
          } else {
            midHours = Math.floor(midMinutes / 60);
            remainingMinutes = midMinutes % 60;
          }
          
          this.cutTimeShift = OwnTime.forTime(midHours.toString(), remainingMinutes.toString());
        } else {
          // Normaler Shift: setze auf Mitte zwischen Start und End
          const midMinutes = startMinutes + Math.floor(totalMinutes / 2);
          const midHours = Math.floor(midMinutes / 60);
          const remainingMinutes = midMinutes % 60;
          this.cutTimeShift = OwnTime.forTime(midHours.toString(), remainingMinutes.toString());
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

    // Konvertiere NgbDate zu Date
    const cutDateAsDate = transformNgbDateStructToDate(this.cutDate);
    if (!cutDateAsDate) {
      return;
    }

    // Erstelle eine tiefe Kopie des Original-Shifts
    const copiedShift = cloneObject<Shift>(this.selectedShift);

    // Original Shift: setze untilDate auf cutDate - 1 Tag
    const dayBeforeCut = new Date(cutDateAsDate);
    dayBeforeCut.setDate(dayBeforeCut.getDate() - 1);
    this.selectedShift.untilDate = dayBeforeCut;
    this.selectedShift.internalUntilDate =
      transformDateToNgbDateStruct(dayBeforeCut);

    // Kopierter Shift: setze fromDate auf cutDate und konfiguriere Nested Set Model
    copiedShift.id = newGuid(); // Temporäre ID für UI (wird im Backend durch EF ersetzt)
    copiedShift.parentId = this.selectedShift.id; // parentId = ID des Original-Shifts
    copiedShift.rootId = this.selectedShift.rootId || this.selectedShift.id; // rootId beibehalten oder auf Original setzen
    copiedShift.fromDate = cutDateAsDate;
    copiedShift.internalFromDate = transformDateToNgbDateStruct(cutDateAsDate);
    
    // Nested Set Model: Berechne lft/rgt Werte
    this.dataManagementShiftCutService.calculateNestedSetValues(copiedShift, this.selectedShift);

    // Füge den kopierten Shift zur Liste hinzu
    this.dataManagementShiftCutService.addCutShift(copiedShift);

    // Emit change event
    this.isChangingEvent.emit(true);

    console.log('Cut by date performed:', {
      originalShift: this.selectedShift,
      copiedShift: copiedShift,
      cutDate: cutDateAsDate,
    });
  }

  private performCutByTime(): void {
    if (!this.selectedShift) {
      return;
    }

    // Erstelle eine tiefe Kopie des Original-Shifts
    const copiedShift = cloneObject<Shift>(this.selectedShift);

    // Speichere den ursprünglichen endShift für 24-Stunden-Shifts
    const originalEndShift = this.selectedShift.endShift;
    const originalInternalEndShift = this.selectedShift.internalEndShift;

    // Original Shift: setze endShift auf cutTime
    this.selectedShift.endShift = `${this.cutTimeShift.hours.toString().padStart(2, '0')}:${this.cutTimeShift.minutes.toString().padStart(2, '0')}`;
    this.selectedShift.internalEndShift = OwnTime.forTime(this.cutTimeShift.hours, this.cutTimeShift.minutes);

    // Kopierter Shift: setze startShift auf cutTime und konfiguriere Nested Set Model
    copiedShift.id = newGuid(); // Temporäre ID für UI (wird im Backend durch EF ersetzt)
    copiedShift.parentId = this.selectedShift.id; // parentId = ID des Original-Shifts
    copiedShift.rootId = this.selectedShift.rootId || this.selectedShift.id; // rootId beibehalten oder auf Original setzen
    copiedShift.startShift = `${this.cutTimeShift.hours.toString().padStart(2, '0')}:${this.cutTimeShift.minutes.toString().padStart(2, '0')}`;
    copiedShift.internalStartShift = OwnTime.forTime(this.cutTimeShift.hours, this.cutTimeShift.minutes);
    
    // Bei 24-Stunden-Shifts: behalte den ursprünglichen endShift für die Kopie bei
    if (this.is24Hours) {
      copiedShift.endShift = originalEndShift;
      copiedShift.internalEndShift = originalInternalEndShift;
    }
    
    // Nested Set Model: Berechne lft/rgt Werte
    this.dataManagementShiftCutService.calculateNestedSetValues(copiedShift, this.selectedShift);

    // Füge den kopierten Shift zur Liste hinzu
    this.dataManagementShiftCutService.addCutShift(copiedShift);
    
    // Emit change event
    this.isChangingEvent.emit(true);
    
    console.log('Cut by time performed:', {
      originalShift: this.selectedShift,
      copiedShift: copiedShift,
      cutTime: this.cutTimeShift,
      is24Hours: this.is24Hours
    });
  }


  private performCutByWeekdays(): void {
    if (!this.selectedShift) {
      return;
    }

    // Erstelle eine tiefe Kopie des Original-Shifts
    const copiedShift = cloneObject<Shift>(this.selectedShift);

    // Original Shift: setze die ausgewählten Weekdays auf false
    this.updateOriginalShiftWeekdays(this.selectedShift);

    // Kopierter Shift: setze nur die ausgewählten Weekdays auf true, rest auf false
    this.updateCopiedShiftWeekdays(copiedShift);

    // Konfiguriere Nested Set Model
    copiedShift.id = newGuid(); // Temporäre ID für UI (wird im Backend durch EF ersetzt)
    copiedShift.parentId = this.selectedShift.id; // parentId = ID des Original-Shifts
    copiedShift.rootId = this.selectedShift.rootId || this.selectedShift.id; // rootId beibehalten oder auf Original setzen
    
    // Nested Set Model: Berechne lft/rgt Werte
    this.dataManagementShiftCutService.calculateNestedSetValues(copiedShift, this.selectedShift);

    // Füge den kopierten Shift zur Liste hinzu
    this.dataManagementShiftCutService.addCutShift(copiedShift);
    
    // Emit change event
    this.isChangingEvent.emit(true);
    
    console.log('Cut by weekdays performed:', {
      originalShift: this.selectedShift,
      copiedShift: copiedShift,
      selectedWeekdays: this.weekdays
    });
  }

  private updateOriginalShiftWeekdays(originalShift: Shift): void {
    // Entferne die ausgewählten Weekdays vom Original
    if (this.weekdays.isMonday) originalShift.isMonday = false;
    if (this.weekdays.isTuesday) originalShift.isTuesday = false;
    if (this.weekdays.isWednesday) originalShift.isWednesday = false;
    if (this.weekdays.isThursday) originalShift.isThursday = false;
    if (this.weekdays.isFriday) originalShift.isFriday = false;
    if (this.weekdays.isSaturday) originalShift.isSaturday = false;
    if (this.weekdays.isSunday) originalShift.isSunday = false;
    if (this.weekdays.isHoliday) originalShift.isHoliday = false;
    if (this.weekdays.isWeekdayOrHoliday) originalShift.isWeekdayOrHoliday = false;
  }

  private updateCopiedShiftWeekdays(copiedShift: Shift): void {
    // Setze alle Weekdays basierend auf der Auswahl
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

    // Erstelle eine tiefe Kopie des Original-Shifts
    const copiedShift = cloneObject<Shift>(this.selectedShift);

    // Berechne die Aufteilung der Mitarbeiter
    const originalStaffCount = this.selectedShift.sumEmployees - this.staffCount;
    const copiedStaffCount = this.staffCount;

    // Original Shift: reduziere sumEmployees
    this.selectedShift.sumEmployees = originalStaffCount;

    // Kopierter Shift: setze sumEmployees auf ausgewählte Anzahl
    copiedShift.id = newGuid(); // Temporäre ID für UI (wird im Backend durch EF ersetzt)
    copiedShift.parentId = this.selectedShift.id; // parentId = ID des Original-Shifts
    copiedShift.rootId = this.selectedShift.rootId || this.selectedShift.id; // rootId beibehalten oder auf Original setzen
    copiedShift.sumEmployees = copiedStaffCount;
    
    // Nested Set Model: Berechne lft/rgt Werte
    this.dataManagementShiftCutService.calculateNestedSetValues(copiedShift, this.selectedShift);

    // Füge den kopierten Shift zur Liste hinzu
    this.dataManagementShiftCutService.addCutShift(copiedShift);
    
    // Emit change event
    this.isChangingEvent.emit(true);
    
    console.log('Cut by staff performed:', {
      originalShift: this.selectedShift,
      copiedShift: copiedShift,
      originalStaffCount: originalStaffCount,
      copiedStaffCount: copiedStaffCount
    });
  }

  private performCutByTask(): void {
    if (!this.selectedShift) {
      return;
    }

    // Erstelle eine tiefe Kopie des Original-Shifts
    const copiedShift = cloneObject<Shift>(this.selectedShift);

    // Berechne die Aufteilung der Tasks
    const originalTaskCount = this.selectedShift.quantity - this.taskCount;
    const copiedTaskCount = this.taskCount;

    // Original Shift: reduziere quantity
    this.selectedShift.quantity = originalTaskCount;

    // Kopierter Shift: setze quantity auf ausgewählte Anzahl
    copiedShift.id = newGuid(); // Temporäre ID für UI (wird im Backend durch EF ersetzt)
    copiedShift.parentId = this.selectedShift.id; // parentId = ID des Original-Shifts
    copiedShift.rootId = this.selectedShift.rootId || this.selectedShift.id; // rootId beibehalten oder auf Original setzen
    copiedShift.quantity = copiedTaskCount;
    
    // Nested Set Model: Berechne lft/rgt Werte
    this.dataManagementShiftCutService.calculateNestedSetValues(copiedShift, this.selectedShift);

    // Füge den kopierten Shift zur Liste hinzu
    this.dataManagementShiftCutService.addCutShift(copiedShift);
    
    // Emit change event
    this.isChangingEvent.emit(true);
    
    console.log('Cut by task performed:', {
      originalShift: this.selectedShift,
      copiedShift: copiedShift,
      originalTaskCount: originalTaskCount,
      copiedTaskCount: copiedTaskCount
    });
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
