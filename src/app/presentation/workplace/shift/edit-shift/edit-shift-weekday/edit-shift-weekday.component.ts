/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  effect,
  EffectRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  runInInjectionContext,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/domain/services/data-management-shift.service';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { ShiftStatus } from 'src/app/domain/models/shift-class';
import { WorkTimeCalculationService } from 'src/app/services/work-time-calculation.service';

@Component({
  selector: 'app-edit-shift-weekday',
  templateUrl: './edit-shift-weekday.component.html',
  styleUrls: ['./edit-shift-weekday.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
  ],
})
export class EditShiftWeekdayComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Input() isComplex = false;

  @ViewChild('weekdayShiftForm', { static: false }) weekdayShiftForm:
    | NgForm
    | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  private workTimeCalculationService = inject(WorkTimeCalculationService);
  private injector = inject(Injector);

  public visibleTable = 'inline';
  public disabledWorkTime = true;
  public areWeekdaysValid: boolean | undefined;
  public isHolidayDisabled = false;

  private objectForUnsubscribe: Subscription | undefined;
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
    
    // Auto-collapse when shift status is IsCut
    if (this.dataManagementShiftService.editShift?.status === ShiftStatus.IsCut) {
      this.visibleTable = 'none';
    }
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.weekdayShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.weekdayShiftForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
          setTimeout(() => this.check(), 100);
          setTimeout(() => this.validateWeekdays(), 100);
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];

    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  OnChangeTime() {
    if (
      this.dataManagementShiftService.editShift &&
      !this.dataManagementShiftService.editShift.isTimeRange
    ) {
      this.calculateWorkTime();
    }
  }

  onKeyUpInput(event: any, data: string) {
    event.currentTarget.value = data;
    this.isChangingEvent.emit(true);
  }

  onHolidayChange() {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift) return;

    // If holiday is selected, unselect weekdayOrHoliday
    if (shift.isHoliday) {
      shift.isWeekdayOrHoliday = false;
    }

    this.isChangingEvent.emit(true);
    this.validateWeekdays();
  }

  onWeekdayOrHolidayChange() {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift) return;

    // If weekdayOrHoliday is selected, unselect holiday
    if (shift.isWeekdayOrHoliday) {
      shift.isHoliday = false;
    }

    this.isChangingEvent.emit(true);
    this.validateWeekdays();
  }

  private check() {
    if (this.dataManagementShiftService.editShift) {
      this.disabledWorkTime = this.dataManagementShiftService.editShift
        .isTimeRange
        ? false
        : true;
    }
  }

  private readSignals(): void {
    try {
      runInInjectionContext(this.injector, () => {
        const effect1 = effect(() => {
          this.dataManagementShiftService.makeValidation();
          this.validateWeekdays();
        });
        this.effects.push(effect1);
      });
    } catch (error) {
      console.error('Error when setting up the effect:', error);
    }
  }

  public validateWeekdays() {
    this.areWeekdaysValid = undefined;

    const shift = this.dataManagementShiftService.editShift;
    if (!shift) {
      this.areWeekdaysValid = undefined;
      return;
    }

    // Check if all weekdays are selected
    const allWeekdaysSelected = shift.isMonday && shift.isTuesday && shift.isWednesday && 
                               shift.isThursday && shift.isFriday && shift.isSaturday && shift.isSunday;

    // If all weekdays are selected, automatically set isWeekdayOrHoliday and disable isHoliday
    if (allWeekdaysSelected) {
      shift.isWeekdayOrHoliday = true;
      shift.isHoliday = false;
      this.isHolidayDisabled = true;
    } else {
      this.isHolidayDisabled = false;
    }

    const hasAnyWeekdaySelected =
      shift.isMonday ||
      shift.isTuesday ||
      shift.isWednesday ||
      shift.isThursday ||
      shift.isFriday ||
      shift.isSaturday ||
      shift.isSunday ||
      shift.isHoliday ||
      shift.isWeekdayOrHoliday;

    this.areWeekdaysValid = hasAnyWeekdaySelected;
  }

  private calculateWorkTime() {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift) return;

    // Verwende den WorkTimeCalculationService für konsistente Berechnung
    const workTimeHours = this.workTimeCalculationService.calculateWorkTime(
      shift.internalStartShift,
      shift.internalEndShift
    );

    // Konvertiere Dezimalstunden zu Minuten für die UI
    const workTimeMinutes = Math.round(workTimeHours * 60);
    shift.workTime = workTimeMinutes;

    // Aktualisiere auch internalWorkTime für die UI-Anzeige
    const workHours = Math.floor(workTimeMinutes / 60);
    const workMinutesRemainder = workTimeMinutes % 60;

    shift.internalWorkTime.hours = workHours.toString().padStart(2, '0');
    shift.internalWorkTime.minutes = workMinutesRemainder
      .toString()
      .padStart(2, '0');

    this.isChangingEvent.emit(true);
  }

  // Getter to determine if fields should be disabled based on shift status
  get isFieldsDisabled(): boolean {
    return this.dataManagementShiftService.editShift?.status === ShiftStatus.IsCut;
  }
}
