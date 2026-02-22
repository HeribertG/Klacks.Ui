// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';

@Component({
  selector: 'app-time-input',
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
  standalone: true,
  imports: [FormsModule],
})
export class TimeInputComponent {
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

  private updateValue(): void {
    this.valueChange.emit(this.value);
    this.timeChange.emit(this.value);
  }

  onHoursInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const hours = input.value;
    this.value.hours = hours;
    this.updateValue();
  }

  onMinutesInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const minutes = input.value;
    this.value.minutes = minutes;
    this.updateValue();
  }

  onInputKeyUp(event: Event): void {
    this.keyUp.emit(event);
  }
}
