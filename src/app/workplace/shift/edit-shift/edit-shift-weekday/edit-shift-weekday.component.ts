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
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';

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
  private injector = inject(Injector);

  public visibleTable = 'inline';
  public disabledWorkTime = true;
  public areWeekdaysValid: boolean | undefined;

  private objectForUnsubscribe: Subscription | undefined;
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
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

  private validateWeekdays() {
    this.areWeekdaysValid = undefined;

    const shift = this.dataManagementShiftService.editShift;
    if (!shift) {
      this.areWeekdaysValid = undefined;
      return;
    }

    const hasAnyWeekdaySelected =
      shift.isMonday ||
      shift.isTuesday ||
      shift.isWednesday ||
      shift.isThursday ||
      shift.isFriday ||
      shift.isSaturday ||
      shift.isSunday ||
      shift.isHoliday;

    this.areWeekdaysValid = hasAnyWeekdaySelected;
  }

  private calculateWorkTime() {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift) return;

    const startHours = parseInt(shift.internalStartShift.hours) || 0;
    const startMinutes = parseInt(shift.internalStartShift.minutes) || 0;
    const endHours = parseInt(shift.internalEndShift.hours) || 0;
    const endMinutes = parseInt(shift.internalEndShift.minutes) || 0;
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let workTimeMinutes: number;

    if (startTotalMinutes === endTotalMinutes) {
      workTimeMinutes = 24 * 60;
    } else if (endTotalMinutes < startTotalMinutes) {
      workTimeMinutes = 24 * 60 - startTotalMinutes + endTotalMinutes;
    } else {
      workTimeMinutes = endTotalMinutes - startTotalMinutes;
    }

    shift.workTime = workTimeMinutes;

    const workHours = Math.floor(workTimeMinutes / 60);
    const workMinutesRemainder = workTimeMinutes % 60;

    shift.internalWorkTime.hours = workHours.toString().padStart(2, '0');
    shift.internalWorkTime.minutes = workMinutesRemainder
      .toString()
      .padStart(2, '0');

    this.isChangingEvent.emit(true);
  }
}
