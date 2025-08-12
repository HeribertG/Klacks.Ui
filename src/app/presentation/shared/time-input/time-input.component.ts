/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OwnTime } from 'src/app/domain/models/schedule-class';

@Component({
  selector: 'app-time-input',
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeInputComponent),
      multi: true,
    },
  ],
})
export class TimeInputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() hoursId?: string;
  @Input() minutesId?: string;
  @Input() hoursName?: string;
  @Input() minutesName?: string;
  @Input() disabled = false;
  @Input() hoursMaxLength = 3;
  @Input() minutesMaxLength = 2;
  @Input() hoursPlaceholder = 'hh';
  @Input() minutesPlaceholder = 'mm';
  @Input() showLabel = true;
  @Input() forDuration = true;
  @Input() labelAlign: 'left' | 'center' | 'right' = 'left';
  @Output() timeChange = new EventEmitter<OwnTime>();
  @Output() keyUp = new EventEmitter<Event>();

  private _value: OwnTime = this.forDuration
    ? OwnTime.forDuration('0', '0')
    : OwnTime.forTime('0', '0');
  @Input()
  private onChange = (value: OwnTime) => {};
  private onTouched = () => {};

  get value(): OwnTime {
    return this._value;
  }

  set value(val: OwnTime) {
    this._value = val;
    this.onChange(val);
    this.onTouched();
  }

  writeValue(value: OwnTime): void {
    if (value) {
      this._value = value;
    }
  }

  registerOnChange(fn: (value: OwnTime) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onHoursChange(hours: string): void {
    this._value.hours = hours;
    this.value = this._value;
    this.timeChange.emit(this._value);
  }

  onMinutesChange(minutes: string): void {
    this._value.minutes = minutes;
    this.value = this._value;
    this.timeChange.emit(this._value);
  }

  onInputKeyUp(event: Event): void {
    this.keyUp.emit(event);
  }
}
