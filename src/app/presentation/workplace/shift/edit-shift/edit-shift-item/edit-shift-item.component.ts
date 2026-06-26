// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
  input,
  output,
  viewChild
} from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ShiftFormService } from '../services/shift-form.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  NgbDatepickerModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { createSmartAbbreviation } from 'src/app/shared/helpers/string.helper';
import { LockComponent } from 'src/app/presentation/icons/icon-lock.component';
import { UnlockComponent } from 'src/app/presentation/icons/icon-unlock.component';
import { ShiftStatus, ShiftType } from 'src/app/domain/models/shift/shift-class';
import { RichTextEditorComponent } from 'src/app/presentation/shared/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-edit-shift-item',
  templateUrl: './edit-shift-item.component.html',
  styleUrls: ['./edit-shift-item.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    FontAwesomeModule,
    NgbDatepickerModule,
    NgbTooltipModule,
    LockComponent,
    UnlockComponent,
    RichTextEditorComponent,
  ],
})
export class EditShiftItemComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly isReadOnly = input(false);
  readonly isChangingEvent = output<boolean>();
  readonly isChangingMode = output();

  readonly mainShiftForm = viewChild<NgForm>('mainShiftForm');
  readonly abbreviation = viewChild<NgModel>('abbreviation');

  public dataManagementShiftService = inject(DataManagementShiftService);
  public shiftFormService = inject(ShiftFormService);
  private localStorageService = inject(LocalStorageService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  public faCalendar = faCalendar;
  public ShiftStatus = ShiftStatus;
  public visibleTable = 'inline';
  public isChecked = false;
  public isAbbreviationValid: boolean | undefined;
  public isNameValid: boolean | undefined;
  public isFromDateValid: boolean | undefined;
  public isLockButtonEnabled = false;
  public objectForUnsubscribe: Subscription | undefined;
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.setMode();

    this.objectForUnsubscribe = this.mainShiftForm()!.valueChanges!.subscribe(
      () => {
        if (this.mainShiftForm()!.dirty === true) {
          setTimeout(() => {
            this.isChangingEvent.emit(true);
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

  onLockClick(): void {
    if (this.dataManagementShiftService.editShift) {
      this.dataManagementShiftService.editShift.status =
        ShiftStatus.SealedOrder;
      this.isChangingEvent.emit(true);
    }
  }

  onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const nameValue = target.value;

    if (
      this.dataManagementShiftService.editShift &&
      this.abbreviation()?.untouched
    ) {
      if (nameValue && nameValue.trim() !== '') {
        this.dataManagementShiftService.editShift.abbreviation =
          createSmartAbbreviation(nameValue.trim(), 6);
      }
    }
    this.isChangingEvent.emit(true);
  }

  onDescriptionChange(content: string): void {
    if (this.dataManagementShiftService.editShift) {
      this.dataManagementShiftService.editShift.description = content;
      this.isChangingEvent.emit(true);
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onComplexModeChecked(): void {
    if (this.isChecked) {
      this.localStorageService.set('mode', 'complex');
    } else {
      this.localStorageService.set('mode', 'simple');
    }

    if (!this.isChecked) {
      if (this.dataManagementShiftService.editShift) {
        this.dataManagementShiftService.editShift.isTimeRange = false;
      }
    }

    this.isChangingMode.emit();
  }

  setMode(): void {
    const currentMode = this.localStorageService.get('mode')
      ? this.localStorageService.get('mode')
      : null;

    this.isChecked = currentMode === 'complex' ? true : false;
  }

  private readSignals(): void {
    try {
      runInInjectionContext(this.injector, () => {
        const effect1 = effect(() => {
          this.dataManagementShiftService.makeValidation();
          this.calcValidation();
          this.cdr.markForCheck();
        });
        this.effects.push(effect1);

        const effect2 = effect(() => {
          const isReset = this.dataManagementShiftService.isReset();
          if (isReset) {
            setTimeout(() => this.isChangingEvent.emit(false), 100);
            this.cdr.markForCheck();
          }
        });
        this.effects.push(effect2);
      });
    } catch (error) {
      console.error('Error when setting up the effect:', error);
    }
  }

  private calcValidation() {
    this.calcValidationAbbreviation();
    this.calcValidationName();
    this.calcValidationFromDate();
    this.calcLockButtonValidation();
  }

  private calcValidationAbbreviation() {
    this.isAbbreviationValid = undefined;

    const abbreviation =
      this.dataManagementShiftService.editShift?.abbreviation;

    if (abbreviation === undefined || abbreviation === null) {
      this.isAbbreviationValid = undefined;
    } else if (abbreviation === '') {
      this.isAbbreviationValid = false;
    } else {
      this.isAbbreviationValid = true;
    }
  }

  private calcValidationName() {
    this.isNameValid = undefined;
    const name = this.dataManagementShiftService.editShift?.name;

    if (name === undefined || name === null) {
      this.isNameValid = undefined;
    } else if (name === '') {
      this.isNameValid = false;
    } else {
      this.isNameValid = true;
    }
  }

  private calcValidationFromDate() {
    this.isFromDateValid = undefined;

    const fromDate = this.shiftFormService.shiftForm()?.internalFromDate;

    if (fromDate) {
      if (fromDate === undefined || fromDate === null) {
        this.isFromDateValid = undefined;
      } else {
        this.isFromDateValid = true;
      }
    }
  }

  private calcLockButtonValidation() {
    const shift = this.dataManagementShiftService.editShift;
    const shiftForm = this.shiftFormService.shiftForm();

    if (!shift) {
      this.isLockButtonEnabled = false;
      return;
    }

    const isAbbreviationValid =
      shift.abbreviation && shift.abbreviation.trim() !== '';
    const isNameValid = shift.name && shift.name.trim() !== '';
    const isFromDateValid =
      shiftForm?.internalFromDate !== undefined && shiftForm?.internalFromDate !== null;

    const hasAnyWeekdaySelected =
      shift.isMonday ||
      shift.isTuesday ||
      shift.isWednesday ||
      shift.isThursday ||
      shift.isFriday ||
      shift.isSaturday ||
      shift.isSunday ||
      shift.isHoliday;

    const hasGroupsSelected = shift.groups && shift.groups.length > 0;

    // Check quantity and sumEmployees are not null or 0
    const isQuantityValid =
      shift.quantity !== null &&
      shift.quantity !== undefined &&
      shift.quantity > 0;
    const isSumEmployeesValid =
      shift.sumEmployees !== null &&
      shift.sumEmployees !== undefined &&
      shift.sumEmployees > 0;

    this.isLockButtonEnabled = Boolean(
      isAbbreviationValid &&
        isNameValid &&
        isFromDateValid &&
        hasAnyWeekdaySelected &&
        hasGroupsSelected &&
        isQuantityValid &&
        isSumEmployeesValid
    );
  }

  get isFieldsDisabled(): boolean {
    if (this.isReadOnly()) return true;
    const status = this.dataManagementShiftService.editShift?.status;
    return status !== undefined && status !== ShiftStatus.OriginalOrder;
  }

  get isValidUntilDisabled(): boolean {
    const shift = this.dataManagementShiftService.editShift;
    const shiftForm = this.shiftFormService.shiftForm();
    if (!shift) return false;

    const hasValidUntil =
      shiftForm?.internalUntilDate !== undefined &&
      shiftForm?.internalUntilDate !== null &&
      Object.keys(shiftForm?.internalUntilDate ?? {}).length > 0;

    return this.isFieldsDisabled && hasValidUntil;
  }

  get isContainerVisible(): boolean {
    const status = this.dataManagementShiftService.editShift?.status;
    return status === ShiftStatus.OriginalOrder;
  }

  get isContainer(): boolean {
    return (
      this.dataManagementShiftService.editShift?.shiftType ===
      ShiftType.IsContainer
    );
  }

  get isContainerChecked(): boolean {
    return this.isContainer;
  }

  set isContainerChecked(value: boolean) {
    if (this.dataManagementShiftService.editShift) {
      this.dataManagementShiftService.editShift.shiftType = value
        ? ShiftType.IsContainer
        : ShiftType.IsTask;

      if (value) {
        this.dataManagementShiftService.editShift.clientId = undefined;
        this.dataManagementShiftService.editShift.addressName = undefined;
        this.dataManagementShiftService.editShift.isTimeRange = false;
      }
    }
  }
}
