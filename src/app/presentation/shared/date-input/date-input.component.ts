// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModule, FontAwesomeModule],
  // No providers needed - using simple Input/Output binding,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateInputComponent {
  @Input() label?: string;
  @Input() inputId?: string;
  @Input() inputName?: string;
  @Input() disabled = false;
  @Input() placeholder = 'dd.mm.yyyy';
  @Input() showLabel = true;
  @Input() labelAlign: 'left' | 'center' | 'right' = 'left';
  @Input() inputWidth = 'medium-width';
  @Input() value: NgbDateStruct | null | undefined = null;
  readonly isValid = input<boolean>();
  readonly touched = input(false);
  readonly showInvalidImmediately = input(false);
  @Output() valueChange = new EventEmitter<NgbDateStruct | null | undefined>();
  @Output() dateChange = new EventEmitter<NgbDateStruct | null | undefined>();

  faCalendar = faCalendar;

  private updateValue(): void {
    this.valueChange.emit(this.value);
    this.dateChange.emit(this.value);
  }

  onDateChange(date: NgbDateStruct | null | undefined): void {
    this.value = date;
    this.updateValue();
  }
}
