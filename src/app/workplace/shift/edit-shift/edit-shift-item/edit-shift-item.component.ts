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
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';

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

  public dataManagementShiftService = inject(DataManagementShiftService);
  private localStorageService = inject(LocalStorageService);
  private injector = inject(Injector);

  public faCalendar = faCalendar;
  public visibleTable = 'inline';
  public isChecked = false;
  public isAbbreviationValid: boolean | undefined;
  public isNameValid: boolean | undefined;
  public isFromDateValid: boolean | undefined;

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
      });
    } catch (error) {
      console.error('Error when setting up the effect:', error);
    }
  }

  private calcValidation() {
    this.calcValidationAbbreviation();
    this.calcValidationName();
    this.calcValidationFromDate();
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
}
