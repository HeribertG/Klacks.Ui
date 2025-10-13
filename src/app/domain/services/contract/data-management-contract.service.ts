/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { Contract, IContract } from 'src/app/domain/models/contract-class';
import { ICalendarSelection } from 'src/app/domain/models/calendar-selection-class';
import { EventBus } from 'src/app/application/services/event-bus.service';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DataContractService } from 'src/app/infrastructure/api/data-contract.service';
import { DataManagementCalendarSelectionService } from '../calendar/data-management-calendar-selection.service';
import { lastValueFrom } from 'rxjs';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/domain/helpers/object-helpers';
import {
  transformDateToNgbDateStruct,
  transformNumberToOwnTime,
  transformNgbDateStructToDate,
  isNgbDateStructOk,
  transformOwnTimeToNumber,
  isOwnTimeStructOk,
} from '../../helpers/format-helper';
import { TranslateService } from '@ngx-translate/core';
import { OwnTime } from '../../models/schedule-class';

@Injectable({
  providedIn: 'root',
})
export class DataManagementContractService {
  private eventBus = inject(EventBus);
  private dataContractService = inject(DataContractService);
  private translate = inject(TranslateService);
  public dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );

  constructor() {}

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public onSaveCompleted?: () => void;

  private _isReset = signal(false);
  get isReset(): boolean { return this._isReset(); }
  public isRead = signal(false);
  public initIsRead = signal(false);

  public emptyPlaceholder = '<Kein>';
  public contracts: IContract[] = [];
  public editContract: IContract | undefined;

  get guaranteedHoursForBinding(): OwnTime {
    return (
      this.editContract?.internalGuaranteedHours ||
      OwnTime.forDuration('00', '00')
    );
  }

  set guaranteedHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.internalGuaranteedHours = value;
    }
  }

  get minimumHoursForBinding(): OwnTime {
    return (
      this.editContract?.internalMinimumHours || OwnTime.forDuration('00', '00')
    );
  }

  set minimumHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.internalMinimumHours = value;
    }
  }

  get maximumHoursForBinding(): OwnTime {
    return (
      this.editContract?.internalMaximumHours || OwnTime.forDuration('00', '00')
    );
  }

  set maximumHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.internalMaximumHours = value;
    }
  }
  public availableCalendars: ICalendarSelection[] = [];

  private editContractDummy: IContract | undefined;

  /* #region   init */

  async init() {
    this.updateEmptyPlaceholder();
    await this.readContracts();
    await this.loadCalendarSelections();

    this.translate.onLangChange.subscribe(() => {
      this.updateEmptyPlaceholder();
    });
  }

  private async loadCalendarSelections(): Promise<void> {
    try {
      if (!this.dataManagementCalendarSelectionService.isRead()) {
        await this.dataManagementCalendarSelectionService.readData();
      }
      this.availableCalendars =
        this.dataManagementCalendarSelectionService.calendarsSelections.filter(
          (cal) => !cal.internal
        );
    } catch (error) {
      console.error('Error loading calendar selections:', error);
      this.availableCalendars = [];
    }
  }

  fireIsReadEvent() {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  /* #endregion   init */

  /* #region   Contract CRUD operations */

  async readContracts(): Promise<IContract[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataContractService.getList());

      this.contracts = [];

      if (result && Array.isArray(result)) {
        this.contracts.push(...result);
      }

      this.fireIsReadEvent();
      return this.contracts;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementContractService.readContracts'
      });
      console.error('Error loading contracts:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async readContract(id: string): Promise<void> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(
        this.dataContractService.getContract(id)
      );

      if (result) {
        this.prepareContract(result);
      }
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementContractService.readContract'
      });
      console.error('Error loading contract:', error);
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  public createContract(): Contract {
    this._showProgressSpinner.set(true);

    const newContract = new Contract();
    newContract.name = '';
    newContract.guaranteedHoursPerMonth = 160;
    newContract.maximumHoursPerMonth = 200;
    newContract.minimumHoursPerMonth = 120;
    newContract.validFrom = new Date();
    newContract.validUntil = undefined;
    newContract.calendarSelection = undefined;

    this.prepareContract(newContract);

    setTimeout(() => {
      this.fireIsReadEvent();
    }, 300);

    this._showProgressSpinner.set(false);

    return newContract;
  }

  private prepareContract(value: IContract, withoutUpdateDummy = false) {
    if (value == null) {
      return;
    }

    this.editContract = value;

    this.setDateStruct(this.editContract);
    this.setTimeStruct(this.editContract);

    if (!withoutUpdateDummy) {
      this.editContractDummy = cloneObject<IContract>(this.editContract);
    }

    setTimeout(() => {
      this._isReset.set(true);
      this._showProgressSpinner.set(false);
      setTimeout(() => this._isReset.set(false), 100);
    }, 200);
  }

  public prepareContractForEdit(contract: IContract): void {
    this.setDateStruct(contract);
    this.setTimeStruct(contract);

    if (contract.calendarSelectionId && !contract.calendarSelection) {
      contract.calendarSelection = this.availableCalendars.find(
        (cal) => cal.id === contract.calendarSelectionId
      );
    }
  }

  public updateContractFromUIValues(contract: IContract): void {
    if (
      contract.internalValidFrom &&
      isNgbDateStructOk(contract.internalValidFrom)
    ) {
      const validFromDate = transformNgbDateStructToDate(
        contract.internalValidFrom
      );
      if (validFromDate) {
        contract.validFrom = validFromDate;
      }
    }

    if (
      contract.internalValidUntil &&
      isNgbDateStructOk(contract.internalValidUntil)
    ) {
      const validUntilDate = transformNgbDateStructToDate(
        contract.internalValidUntil
      );
      if (validUntilDate) {
        contract.validUntil = validUntilDate;
      }
    } else {
      contract.validUntil = undefined;
    }

    // Update hours from struct
    if (
      contract.internalGuaranteedHours &&
      isOwnTimeStructOk(contract.internalGuaranteedHours)
    ) {
      contract.guaranteedHoursPerMonth = transformOwnTimeToNumber(
        contract.internalGuaranteedHours
      );
    }

    if (
      contract.internalMinimumHours &&
      isOwnTimeStructOk(contract.internalMinimumHours)
    ) {
      contract.minimumHoursPerMonth = transformOwnTimeToNumber(
        contract.internalMinimumHours
      );
    }

    if (
      contract.internalMaximumHours &&
      isOwnTimeStructOk(contract.internalMaximumHours)
    ) {
      contract.maximumHoursPerMonth = transformOwnTimeToNumber(
        contract.internalMaximumHours
      );
    }
  }

  public async saveExistingContract(contract: IContract): Promise<boolean> {
    this.editContract = contract;
    return await this.saveEditContract();
  }

  async saveContract(): Promise<boolean> {
    return this.saveEditContract();
  }

  private async saveEditContract(withoutUpdateDummy = false): Promise<boolean> {
    if (!this.editContract) {
      return false;
    }

    this._showProgressSpinner.set(true);

    try {
      const action = this.editContract.id
        ? this.dataContractService.updateContract(this.editContract)
        : this.dataContractService.addContract(this.editContract);

      const result = await lastValueFrom(action);

      if (result) {
        this.prepareContract(result, withoutUpdateDummy);
        await this.readContracts();

        if (this.onSaveCompleted) {
          this.onSaveCompleted();
        }

        return true;
      }

      return false;
    } catch (error: any) {
      if (this.editContract?.id) {
        await this.readContract(this.editContract.id);
      }

      if (this.onSaveCompleted) {
        this.onSaveCompleted();
      }

      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async deleteContract(id: string): Promise<boolean> {
    if (!id || id === '') {
      return false;
    }

    this._showProgressSpinner.set(true);

    try {
      await lastValueFrom(this.dataContractService.deleteContract(id));

      await this.readContracts();

      return true;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorDeletingData',
        context: 'DataManagementContractService.deleteContract'
      });
      console.error('Error deleting contract:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  /* #endregion   Contract CRUD operations */

  /* #region   Helper methods */

  private setDateStruct(value: IContract) {
    if (value) {
      value.internalValidFrom = transformDateToNgbDateStruct(value.validFrom);
      if (value.validUntil) {
        value.internalValidUntil = transformDateToNgbDateStruct(
          value.validUntil
        );
      }
    }
  }

  private setTimeStruct(value: IContract) {
    if (value) {
      value.internalGuaranteedHours = transformNumberToOwnTime(
        value.guaranteedHoursPerMonth,
        true
      );
      value.internalMinimumHours = transformNumberToOwnTime(
        value.minimumHoursPerMonth,
        true
      );
      value.internalMaximumHours = transformNumberToOwnTime(
        value.maximumHoursPerMonth,
        true
      );
    }
  }

  private updateEmptyPlaceholder(): void {
    this.emptyPlaceholder = this.translate.instant('none');
  }

  /* #endregion   Helper methods */

  /* #region   Data state management */

  resetData() {
    if (this.editContractDummy) {
      this.prepareContract(this.editContractDummy);
    }
  }

  areObjectsDirty(): boolean {
    return this.isEditContract_Dirty();
  }

  save() {
    if (this.isEditContract_Dirty()) {
      this.saveEditContract();
    }
  }

  private isEditContract_Dirty(): boolean {
    const a = this.editContract as IContract;
    const b = this.editContractDummy as IContract;

    if (!compareComplexObjects(a, b)) {
      return this.isValid();
    }
    return false;
  }

  isValid(): boolean {
    if (!this.editContract) {
      return false;
    }

    if (
      this.editContract.name &&
      this.editContract.name.trim() !== '' &&
      this.editContract.name !== this.emptyPlaceholder &&
      this.editContract.validFrom &&
      this.editContract.internalValidFrom &&
      isNgbDateStructOk(this.editContract.internalValidFrom) &&
      this.editContract.guaranteedHoursPerMonth >= 0 &&
      this.editContract.maximumHoursPerMonth >= 0 &&
      this.editContract.minimumHoursPerMonth >= 0 &&
      this.editContract.minimumHoursPerMonth <=
        this.editContract.maximumHoursPerMonth &&
      this.editContract.guaranteedHoursPerMonth <=
        this.editContract.maximumHoursPerMonth &&
      this.editContract.guaranteedHoursPerMonth >=
        this.editContract.minimumHoursPerMonth
    ) {
      // Check date range if validUntil is set
      if (
        this.editContract.validUntil &&
        this.editContract.validUntil <= this.editContract.validFrom
      ) {
        return false;
      }
      return true;
    }
    return false;
  }

  /* #endregion   Data state management */

  /* #region   Utility methods */

  setCurrentContract(contract: IContract) {
    if (!contract) {
      this.createContract();
      return;
    }

    const contractCopy = cloneObject<IContract>(contract);
    this.prepareContract(contractCopy);
  }

  validateContract(contract: IContract): string[] {
    const errors: string[] = [];

    if (
      !contract.name ||
      contract.name.trim() === '' ||
      contract.name === this.emptyPlaceholder
    ) {
      errors.push(
        this.translate.instant('setting.contract.validation.nameRequired')
      );
    }

    if (contract.guaranteedHoursPerMonth < 0) {
      errors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedHoursNegative'
        )
      );
    }

    if (contract.maximumHoursPerMonth < 0) {
      errors.push(
        this.translate.instant('setting.contract.validation.maxHoursNegative')
      );
    }

    if (contract.minimumHoursPerMonth < 0) {
      errors.push(
        this.translate.instant('setting.contract.validation.minHoursNegative')
      );
    }

    if (contract.minimumHoursPerMonth > contract.maximumHoursPerMonth) {
      errors.push(
        this.translate.instant('setting.contract.validation.minGreaterThanMax')
      );
    }

    if (contract.guaranteedHoursPerMonth > contract.maximumHoursPerMonth) {
      errors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedGreaterThanMax'
        )
      );
    }

    if (contract.guaranteedHoursPerMonth < contract.minimumHoursPerMonth) {
      errors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedLessThanMin'
        )
      );
    }

    if (!contract.validFrom) {
      errors.push(
        this.translate.instant('setting.contract.validation.validFromRequired')
      );
    }

    if (
      contract.validUntil &&
      contract.validFrom &&
      contract.validUntil <= contract.validFrom
    ) {
      errors.push(
        this.translate.instant('setting.contract.validation.invalidDateRange')
      );
    }

    return errors;
  }

  getValidationErrors(): string[] {
    if (!this.editContract) {
      return [
        this.translate.instant(
          'setting.contract.validation.noContractSelected'
        ),
      ];
    }

    return this.validateContract(this.editContract);
  }

  hasUnsavedChanges(): boolean {
    return this.isEditContract_Dirty();
  }

  isNewContract(): boolean {
    return !this.editContract?.id;
  }

  /* #endregion   Utility methods */
}
