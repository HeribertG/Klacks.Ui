import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true
    }
  ]
})
export class DateInputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() inputId?: string;
  @Input() inputName?: string;
  @Input() disabled: boolean = false;
  @Input() placeholder: string = 'dd.mm.yyyy';
  @Input() showLabel: boolean = true;
  @Input() labelAlign: 'left' | 'center' | 'right' = 'left';
  @Input() inputWidth: string = 'medium-width';
  @Output() dateChange = new EventEmitter<NgbDateStruct | null>();

  faCalendar = faCalendar;

  private _value: NgbDateStruct | null = null;
  private onChange = (value: NgbDateStruct | null) => {};
  private onTouched = () => {};

  get value(): NgbDateStruct | null {
    return this._value;
  }

  set value(val: NgbDateStruct | null) {
    this._value = val;
    this.onChange(val);
    this.onTouched();
    this.dateChange.emit(val);
  }

  writeValue(value: NgbDateStruct | null): void {
    this._value = value;
  }

  registerOnChange(fn: (value: NgbDateStruct | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onDateChange(date: NgbDateStruct | null): void {
    this.value = date;
  }
}