/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgbModule,
  NgbModal,
  NgbDateStruct,
  NgbCalendar,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';

import { IContract, Contract } from 'src/app/domain/models/contract-class';
import { ICalendarSelection } from 'src/app/domain/models/calendar-selection-class';
import { DataManagementContractService } from 'src/app/domain/services/data-management-contract.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/data-management-calendar-selection.service';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
  isNgbDateStructOk,
  transformNumberToOwnTime,
  transformOwnTimeToNumber,
  isOwnTimeStructOk,
} from 'src/app/domain/helpers/format-helper';
import { OwnTime } from 'src/app/domain/models/schedule-class';

@Component({
  selector: 'app-contract-row',
  templateUrl: './contract-row.component.html',
  styleUrls: ['./contract-row.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    TranslateModule,
    TimeInputComponent,
    DateInputComponent,
  ],
})
export class ContractRowComponent implements OnInit {
  @Input() data: IContract = new Contract();
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isDeleteEvent = new EventEmitter<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  private calendar = inject(NgbCalendar);
  public dataManagementContractService = inject(DataManagementContractService);
  public dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );

  public currentContract: IContract = new Contract();
  public validFromModel: NgbDateStruct | null = null;
  public validUntilModel: NgbDateStruct | null = null;
  public selectedCalendarId = '';
  public availableCalendars: ICalendarSelection[] = [];
  public validationErrors: string[] = [];

  // Internal time properties for hour:minute inputs
  public internalGuaranteedHours: OwnTime = new OwnTime('00', '00', true);
  public internalMinimumHours: OwnTime = new OwnTime('00', '00', true);
  public internalMaximumHours: OwnTime = new OwnTime('00', '00', true);

  async ngOnInit(): Promise<void> {
    await this.loadCalendarSelections();
  }

  private async loadCalendarSelections(): Promise<void> {
    try {
      if (!this.dataManagementCalendarSelectionService.isRead()) {
        this.dataManagementCalendarSelectionService.readData();
      }
      this.availableCalendars =
        this.dataManagementCalendarSelectionService.calendarsSelections.filter(
          (cal) => !cal.internal
        );
    } catch (error) {
      console.error('Error loading calendar selections:', error);
    }
  }

  open(content: any): void {
    this.currentContract = { ...this.data };
    this.setupDatePickers();
    this.setupCalendarSelection();
    this.setupTimeInputs();
    this.validateForm();

    this.modalService.open(content, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  private setupDatePickers(): void {
    if (this.currentContract.validFrom) {
      const dateStruct = transformDateToNgbDateStruct(
        this.currentContract.validFrom
      );
      this.validFromModel = dateStruct
        ? (dateStruct as NgbDateStruct)
        : this.calendar.getToday();
    } else {
      this.validFromModel = this.calendar.getToday();
    }

    if (this.currentContract.validUntil) {
      const dateStruct = transformDateToNgbDateStruct(
        this.currentContract.validUntil
      );
      this.validUntilModel = dateStruct ? (dateStruct as NgbDateStruct) : null;
    } else {
      this.validUntilModel = null;
    }
  }

  private setupCalendarSelection(): void {
    this.selectedCalendarId = this.currentContract.calendarSelection?.id || '';
  }

  private setupTimeInputs(): void {
    // Convert numbers to OwnTime structures
    this.internalGuaranteedHours = transformNumberToOwnTime(
      this.currentContract.guaranteedHoursPerMonth,
      true
    );
    this.internalMinimumHours = transformNumberToOwnTime(
      this.currentContract.minimumHoursPerMonth,
      true
    );
    this.internalMaximumHours = transformNumberToOwnTime(
      this.currentContract.maximumHoursPerMonth,
      true
    );
  }

  onCalendarSelectionChange(): void {
    if (this.selectedCalendarId) {
      const selectedCalendar = this.availableCalendars.find(
        (cal) => cal.id === this.selectedCalendarId
      );
      this.currentContract.calendarSelection = selectedCalendar;
    } else {
      this.currentContract.calendarSelection = undefined;
    }
    this.validateForm();
  }

  onTimeInputChange(): void {
    // Convert OwnTime back to numbers for the model
    if (isOwnTimeStructOk(this.internalGuaranteedHours)) {
      this.currentContract.guaranteedHoursPerMonth = transformOwnTimeToNumber(
        this.internalGuaranteedHours
      );
    }
    if (isOwnTimeStructOk(this.internalMinimumHours)) {
      this.currentContract.minimumHoursPerMonth = transformOwnTimeToNumber(
        this.internalMinimumHours
      );
    }
    if (isOwnTimeStructOk(this.internalMaximumHours)) {
      this.currentContract.maximumHoursPerMonth = transformOwnTimeToNumber(
        this.internalMaximumHours
      );
    }
    this.validateForm();
  }

  async onSave(modal: any): Promise<void> {
    this.validateForm();

    if (!this.isFormValid()) {
      return;
    }

    try {
      // Update dates from date pickers
      if (this.validFromModel && isNgbDateStructOk(this.validFromModel)) {
        const validFromDate = transformNgbDateStructToDate(this.validFromModel);
        if (validFromDate) {
          this.currentContract.validFrom = validFromDate;
        }
      }

      if (this.validUntilModel && isNgbDateStructOk(this.validUntilModel)) {
        const validUntilDate = transformNgbDateStructToDate(
          this.validUntilModel
        );
        if (validUntilDate) {
          this.currentContract.validUntil = validUntilDate;
        }
      } else {
        this.currentContract.validUntil = undefined;
      }

      // Update the service's current contract and save
      this.dataManagementContractService.setCurrentContract(
        this.currentContract
      );
      const success = await this.dataManagementContractService.saveContract();

      if (success) {
        // Update the local data reference
        Object.assign(this.data, this.currentContract);
        this.isChangingEvent.emit(true);
        modal.close();
      }
    } catch (error) {
      console.error('Error saving contract:', error);
    }
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  validateForm(): void {
    this.validationErrors = [];

    if (!this.currentContract.name || this.currentContract.name.trim() === '') {
      this.validationErrors.push(
        this.translate.instant('setting.contract.validation.nameRequired')
      );
    }

    if (this.currentContract.guaranteedHoursPerMonth < 0) {
      this.validationErrors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedHoursNegative'
        )
      );
    }

    if (this.currentContract.maximumHoursPerMonth < 0) {
      this.validationErrors.push(
        this.translate.instant('setting.contract.validation.maxHoursNegative')
      );
    }

    if (this.currentContract.minimumHoursPerMonth < 0) {
      this.validationErrors.push(
        this.translate.instant('setting.contract.validation.minHoursNegative')
      );
    }

    if (
      this.currentContract.minimumHoursPerMonth >
      this.currentContract.maximumHoursPerMonth
    ) {
      this.validationErrors.push(
        this.translate.instant('setting.contract.validation.minGreaterThanMax')
      );
    }

    if (
      this.currentContract.guaranteedHoursPerMonth >
      this.currentContract.maximumHoursPerMonth
    ) {
      this.validationErrors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedGreaterThanMax'
        )
      );
    }

    if (
      this.currentContract.guaranteedHoursPerMonth <
      this.currentContract.minimumHoursPerMonth
    ) {
      this.validationErrors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedLessThanMin'
        )
      );
    }

    // Validate date range
    if (
      this.validFromModel &&
      this.validUntilModel &&
      isNgbDateStructOk(this.validFromModel) &&
      isNgbDateStructOk(this.validUntilModel)
    ) {
      const validFrom = transformNgbDateStructToDate(this.validFromModel);
      const validUntil = transformNgbDateStructToDate(this.validUntilModel);

      if (validFrom && validUntil && validUntil <= validFrom) {
        this.validationErrors.push(
          this.translate.instant('setting.contract.validation.invalidDateRange')
        );
      }
    }
  }

  isFormValid(): boolean {
    this.validateForm();
    return this.validationErrors.length === 0;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';

    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return '';
    }
  }
}
