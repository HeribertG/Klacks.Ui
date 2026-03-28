// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ViewChild, ElementRef,
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
  @ViewChild('minutesInput') minutesInput?: ElementRef<HTMLInputElement>;

  @Input() label?: string;
  @Input() hoursId?: string;
  @Input() minutesId?: string;
  @Input() hoursName?: string;
  @Input() minutesName?: string;
  @Input() disabled = false;
  @Input() hoursMaxLength = 3;
  @Input() hoursPlaceholder = 'hh';
  @Input() minutesPlaceholder = 'mm';
  @Input() showLabel = true;
  @Input() forDuration = true;
  @Input() labelAlign: 'left' | 'center' | 'right' = 'left';
  @Input() value: OwnTime = OwnTime.forTime('00', '00');
  @Output() valueChange = new EventEmitter<OwnTime>();
  @Output() timeChange = new EventEmitter<OwnTime>();
  @Output() keyUp = new EventEmitter<Event>();

  partialHours: string | null = null;

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
    this.value.minutes = input.value;
    this.updateValue();
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
      const el = this.minutesInput?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }
}
