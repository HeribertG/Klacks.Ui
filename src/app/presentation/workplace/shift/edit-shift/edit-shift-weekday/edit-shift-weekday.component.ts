// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EffectRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  runInInjectionContext,
  ViewChild,
  input,
  output
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { ShiftFormService } from '../services/shift-form.service';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { ShiftStatus, ShiftType } from 'src/app/domain/models/shift/shift-class';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';

@Component({
  selector: 'app-edit-shift-weekday',
  templateUrl: './edit-shift-weekday.component.html',
  styleUrls: ['./edit-shift-weekday.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    TimeInputComponent,
  ],
})
export class EditShiftWeekdayComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly isReadOnly = input(false);
  readonly isChangingEvent = output<boolean>();
  readonly isComplex = input(false);

  @ViewChild('weekdayShiftForm', { static: false }) weekdayShiftForm:
    | NgForm
    | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  public shiftFormService = inject(ShiftFormService);
  private workTimeCalculationService = inject(WorkTimeCalculationService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  public visibleTable = 'inline';
  public disabledWorkTime = true;
  public areWeekdaysValid: boolean | undefined;
  public isHolidayDisabled = false;

  private objectForUnsubscribe: Subscription | undefined;
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.weekdayShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.weekdayShiftForm!.dirty === true) {
          setTimeout(() => {
            this.isChangingEvent.emit(true);
            this.check();
            this.validateWeekdays();
            this.cdr.markForCheck();
          }, 100);
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
      shift.isWeekdayAndHoliday = false;
    }

    this.isChangingEvent.emit(true);
    this.validateWeekdays();
  }

  onWeekdayOrHolidayChange() {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift) return;

    // If weekdayOrHoliday is selected, unselect holiday
    if (shift.isWeekdayAndHoliday) {
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
          this.cdr.markForCheck();
        });
        this.effects.push(effect1);

        const effect2 = effect(() => {
          const shift = this.dataManagementShiftService.editShift;
          if (shift && this.isContainer && shift.isTimeRange) {
            shift.isTimeRange = false;
          }
          this.cdr.markForCheck();
        });
        this.effects.push(effect2);
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

    if (allWeekdaysSelected) {
      shift.isWeekdayAndHoliday = true;
      shift.isHoliday = false;
      this.isHolidayDisabled = true;
      const dummy = this.dataManagementShiftService.editShiftDummy;
      if (dummy) {
        dummy.isWeekdayAndHoliday = true;
        dummy.isHoliday = false;
      }
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
      shift.isWeekdayAndHoliday;

    this.areWeekdaysValid = hasAnyWeekdaySelected;
  }

  private calculateWorkTime() {
    const shift = this.dataManagementShiftService.editShift;
    const shiftForm = this.shiftFormService.shiftForm();
    if (!shift || !shiftForm) return;

    const workTimeHours = this.workTimeCalculationService.calculateWorkTime(
      shiftForm.internalStartShift,
      shiftForm.internalEndShift
    );

    const workTimeMinutes = Math.round(workTimeHours * 60);
    shift.workTime = workTimeMinutes;

    const workHours = Math.floor(workTimeMinutes / 60);
    const workMinutesRemainder = workTimeMinutes % 60;

    shiftForm.internalWorkTime.hours = workHours.toString().padStart(2, '0');
    shiftForm.internalWorkTime.minutes = workMinutesRemainder
      .toString()
      .padStart(2, '0');

    this.isChangingEvent.emit(true);
  }

  get isFieldsDisabled(): boolean {
    if (this.isReadOnly()) return true;
    const status = this.dataManagementShiftService.editShift?.status;
    return status !== undefined && status !== ShiftStatus.OriginalOrder;
  }

  get isContainer(): boolean {
    return (
      this.dataManagementShiftService.editShift?.shiftType === ShiftType.IsContainer
    );
  }
}
