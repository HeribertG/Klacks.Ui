/* eslint-disable @typescript-eslint/class-literal-property-style */
import {
  AfterViewInit,
  Component,
  effect,
  EffectRef,
  EventEmitter,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  runInInjectionContext,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/domain/services/data-management-shift.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
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
import { createSmartAbbreviation } from 'src/app/domain/helpers/format-helper';
import { LockComponent } from 'src/app/presentation/icons/icon-lock.component';
import { UnlockComponent } from 'src/app/presentation/icons/icon-unlock.component';
import { ShiftStatus } from 'src/app/domain/models/shift-class';

@Component({
  selector: 'app-edit-shift-item',
  templateUrl: './edit-shift-item.component.html',
  styleUrls: ['./edit-shift-item.component.scss'],
  standalone: true,
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
  ],
})
export class EditShiftItemComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isChangingMode = new EventEmitter();

  @ViewChild('mainShiftForm', { static: false }) mainShiftForm:
    | NgForm
    | undefined;
  @ViewChild('abbreviation', { static: false }) abbreviation:
    | NgModel
    | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  private localStorageService = inject(LocalStorageService);
  private injector = inject(Injector);

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

    this.objectForUnsubscribe = this.mainShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.mainShiftForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
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
      this.dataManagementShiftService.editShift.status = ShiftStatus.ReadyToCut;
      this.isChangingEvent.emit(true);
    }
  }

  onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const nameValue = target.value;

    if (
      this.dataManagementShiftService.editShift &&
      this.abbreviation?.untouched
    ) {
      if (nameValue && nameValue.trim() !== '') {
        this.dataManagementShiftService.editShift.abbreviation =
          createSmartAbbreviation(nameValue.trim(), 6);
      }
    }
    this.isChangingEvent.emit(true);
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
        });
        this.effects.push(effect1);

        const effect2 = effect(() => {
          const isReset = this.dataManagementShiftService.isReset();
          if (isReset) {
            setTimeout(() => this.isChangingEvent.emit(false), 100);
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

    const fromDate =
      this.dataManagementShiftService.editShift?.internalFromDate;

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

    if (!shift) {
      this.isLockButtonEnabled = false;
      return;
    }

    const isAbbreviationValid =
      shift.abbreviation && shift.abbreviation.trim() !== '';
    const isNameValid = shift.name && shift.name.trim() !== '';
    const isFromDateValid =
      shift.internalFromDate !== undefined && shift.internalFromDate !== null;

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

  // Getter to determine if most fields should be disabled based on shift status
  get isFieldsDisabled(): boolean {
    return (
      this.dataManagementShiftService.editShift?.status === ShiftStatus.IsCut
    );
  }

  // Getter for fields that should remain enabled even when IsCut
  // Returns false because these specific fields (abbreviation, name, description) should stay enabled
  get isEditableFieldsDisabled(): boolean {
    return false; // abbreviation, name, description always remain enabled
  }
}
