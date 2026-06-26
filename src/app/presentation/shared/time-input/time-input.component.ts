// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, Input,
  ChangeDetectionStrategy, ElementRef,
  input,
  output,
  viewChild
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';

@Component({
  selector: 'app-time-input',
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeInputComponent {
  readonly minutesInput = viewChild<ElementRef<HTMLInputElement>>('minutesInput');

  @Input() label?: string;
  readonly hoursId = input<string>();
  readonly minutesId = input<string>();
  readonly hoursName = input<string>();
  readonly minutesName = input<string>();
  readonly disabled = input(false);
  readonly hoursMaxLength = input(3);
  readonly hoursPlaceholder = input('hh');
  readonly minutesPlaceholder = input('mm');
  @Input() showLabel = true;
  @Input() forDuration = true;
  readonly labelAlign = input<'left' | 'center' | 'right'>('left');
  @Input() value: OwnTime = OwnTime.forTime('00', '00');
  readonly valueChange = output<OwnTime>();
  readonly timeChange = output<OwnTime>();
  readonly keyUp = output<Event>();

  partialHours: string | null = null;
  partialMinutes: string | null = null;

  private updateValue(): void {
    this.valueChange.emit(this.value);
    this.timeChange.emit(this.value);
  }

  onFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    setTimeout(() => input.select());
  }

  onHoursInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');

    if (!this.forDuration) {
      if (raw.length === 0) {
        this.partialHours = null;
        this.value.hours = raw;
        this.updateValue();
        return;
      }

      if (raw.length === 1 && parseInt(raw[0]) > 2) {
        this.partialHours = null;
        this.value.hours = '0' + raw;
        this.focusMinutes();
        this.updateValue();
        return;
      }

      if (raw.length === 1) {
        this.partialHours = raw;
        return;
      }

      if (raw.length >= 2) {
        this.partialHours = null;
        this.value.hours = raw;
        this.focusMinutes();
        this.updateValue();
        return;
      }
    }

    this.partialHours = null;
    this.value.hours = raw;
    this.updateValue();
  }

  onMinutesInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');

    if (raw.length === 0) {
      this.partialMinutes = null;
      this.value.minutes = raw;
      this.updateValue();
      return;
    }

    if (raw.length === 1 && parseInt(raw[0]) > 5) {
      this.partialMinutes = null;
      this.value.minutes = '0' + raw;
      this.updateValue();
      return;
    }

    if (raw.length === 1) {
      this.partialMinutes = raw;
      return;
    }

    this.partialMinutes = null;
    const lastTwo = raw.slice(-2);
    const parsed = parseInt(lastTwo, 10);
    this.value.minutes = parsed > 59
      ? '59'
      : lastTwo.padStart(2, '0');
    this.updateValue();
  }

  onMinutesBlur(): void {
    if (this.partialMinutes !== null) {
      this.value.minutes = '0' + this.partialMinutes;
      this.partialMinutes = null;
      this.updateValue();
    }
  }

  onHoursBlur(): void {
    if (this.partialHours !== null) {
      this.value.hours = this.partialHours;
      this.partialHours = null;
      this.updateValue();
    }
  }

  onInputKeyUp(event: Event): void {
    this.keyUp.emit(event);
  }

  private focusMinutes(): void {
    setTimeout(() => {
      const el = this.minutesInput()?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }
}
