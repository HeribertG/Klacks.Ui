// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EventEmitter,
  inject,
  OnDestroy,
  Output,
  ViewChild,
  input
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { ShiftFormService } from '../services/shift-form.service';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { ShiftStatus, ShiftType } from 'src/app/domain/models/shift/shift-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';

const SPORADIC_TYPE_TRANSLATION_KEYS: readonly string[] = [
  'SHIFT_SPORADIC_WEEK',
  'SHIFT_SPORADIC_MONTH',
  'SHIFT_SPORADIC_QUARTER',
  'SHIFT_SPORADIC_SEMESTER',
  'SHIFT_SPORADIC_YEAR',
  'SHIFT_SPORADIC_CONTRACTUALTERM',
];

@Component({
  selector: 'app-edit-shift-special-feature',
  templateUrl: './edit-shift-special-feature.component.html',
  styleUrls: ['./edit-shift-special-feature.component.scss'],
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
export class EditShiftSpecialFeatureComponent
  implements AfterViewInit, OnDestroy
{
  readonly isReadOnly = input(false);
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('specialFeatureShiftForm', { static: false })
  specialFeatureShiftForm: NgForm | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  public shiftFormService = inject(ShiftFormService);
  private cdr = inject(ChangeDetectorRef);

  public visibleTable = 'inline';
  public isSumEmployeesValid: boolean | undefined;
  public isQuantityValid: boolean | undefined;
  private objectForUnsubscribe: Subscription | undefined;
  public sporadicType = 0;

  private isResetEffect = effect(() => {
    this.dataManagementShiftService.isReset();
    this.cdr.markForCheck();
  });

  ngAfterViewInit(): void {
    this.objectForUnsubscribe =
      this.specialFeatureShiftForm!.valueChanges!.subscribe(() => {
        if (this.specialFeatureShiftForm!.dirty === true) {
          setTimeout(() => {
            this.validateNumberInputs();
            this.isChangingEvent.emit(true);
            this.cdr.markForCheck();
          }, 100);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onSporadicTypeName(index: number): string {
    return SPORADIC_TYPE_TRANSLATION_KEYS[index] ?? '';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onKeyUpInput(event: any, data: string) {
    event.currentTarget.value = data;
    this.isChangingEvent.emit(true);
  }

  onStatusChange() {
    this.isChangingEvent.emit(true);
  }

  onNumberChange() {
    this.isChangingEvent.emit(true);
    this.validateNumberInputs();
  }

  private validateNumberInputs() {
    this.validateSumEmployees();
    this.validateQuantity();
  }

  private validateSumEmployees() {
    this.isSumEmployeesValid = undefined;

    const sumEmployees =
      this.dataManagementShiftService.editShift?.sumEmployees;

    if (sumEmployees === undefined || sumEmployees === null) {
      this.isSumEmployeesValid = false;
    } else if (sumEmployees <= 0) {
      this.isSumEmployeesValid = false;
    } else {
      this.isSumEmployeesValid = true;
    }
  }

  private validateQuantity() {
    this.isQuantityValid = undefined;

    const quantity = this.dataManagementShiftService.editShift?.quantity;

    if (quantity === undefined || quantity === null) {
      this.isQuantityValid = false;
    } else if (quantity <= 0) {
      this.isQuantityValid = false;
    } else {
      this.isQuantityValid = true;
    }
  }

  get isFieldsDisabled(): boolean {
    if (this.isReadOnly()) return true;
    const status = this.dataManagementShiftService.editShift?.status;
    return status !== undefined && status !== ShiftStatus.OriginalOrder;
  }

  get isContainer(): boolean {
    return (
      this.dataManagementShiftService.editShift?.shiftType ===
      ShiftType.IsContainer
    );
  }
}
