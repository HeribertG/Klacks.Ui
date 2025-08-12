/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { Contract, IContract } from 'src/app/domain/models/contract-class';
import { ICalendarSelection } from 'src/app/domain/models/calendar-selection-class';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataContractService } from 'src/app/infrastructure/api/data-contract.service';
import { DataManagementCalendarSelectionService } from './data-management-calendar-selection.service';
import { lastValueFrom } from 'rxjs';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
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
} from '../helpers/format-helper';
import { TranslateService } from '@ngx-translate/core';
import { OwnTime } from '../models/schedule-class';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { IManageable } from 'src/app/presentation/workplace/core/interfaces/manageable.interface';
import { ManageableServiceRegistry } from 'src/app/presentation/workplace/core/manageable-service-registry';
import { RouteName } from 'src/app/domain/models/entity-names.enum';

@Injectable({
  providedIn: 'root',
})
export class DataManagementContractService implements IManageable {
  public toastShowService = inject(ToastShowService);
  private dataContractService = inject(DataContractService);
  private translate = inject(TranslateService);
  private navigationService = inject(NavigationService);
  public dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );

  constructor() {
    ManageableServiceRegistry.register(
      RouteName.SETTINGS,
      DataManagementContractService
    );
  }

  public showProgressSpinner = signal(false);
  public onSaveCompleted?: () => void;

  public isReset = signal(false);
  public isRead = signal(false);
  public initIsRead = signal(false);

  public emptyPlaceholder = '<Kein>';
  public contracts: IContract[] = [];
  public editContract: IContract | undefined;

  // Separate property accessors to prevent ngModel binding conflicts
  get guaranteedHoursForBinding(): OwnTime {
    return this.editContract?.internalGuaranteedHours || OwnTime.forDuration('00', '00');
  }

  set guaranteedHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.internalGuaranteedHours = value;
    }
  }

  get minimumHoursForBinding(): OwnTime {
    return this.editContract?.internalMinimumHours || OwnTime.forDuration('00', '00');
  }

  set minimumHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.internalMinimumHours = value;
    }
  }

  get maximumHoursForBinding(): OwnTime {
    return this.editContract?.internalMaximumHours || OwnTime.forDuration('00', '00');
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
    this.showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataContractService.getList());

      this.contracts = [this.emptyContract()];

      if (result && Array.isArray(result)) {
        this.contracts.push(...result);
      }

      this.fireIsReadEvent();
      return this.contracts;
    } catch (error) {
      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'errorLoadingData'
      );
      console.error('Error loading contracts:', error);
      return [];
    } finally {
      this.showProgressSpinner.set(false);
    }
  }

  async readContract(id: string): Promise<void> {
    if (!id || id === '') {
      this.createContract();
      return;
    }

    this.showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(
        this.dataContractService.getContract(id)
      );

      if (result) {
        this.prepareContract(result);
      } else {
        this.createContract();
      }
    } catch (error) {
      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'errorLoadingData'
      );
      console.error('Error loading contract:', error);
      this.createContract();
    } finally {
      this.showProgressSpinner.set(false);
    }
  }

  createNewContract(): Contract {
    this.createContract();
    return this.editContract as Contract;
  }

  private createContract() {
    this.showProgressSpinner.set(true);

    const newContract = new Contract();
    newContract.name = '';
    newContract.guaranteedHoursPerMonth = 160;
    newContract.maximumHoursPerMonth = 200;
    newContract.minimumHoursPerMonth = 120;
    newContract.validFrom = new Date();
    newContract.validUntil = undefined;
    newContract.calendarSelection = undefined;
    newContract.internal = false;

    this.prepareContract(newContract);

    setTimeout(() => {
      this.fireIsReadEvent();
    }, 300);

    this.showProgressSpinner.set(false);
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
      this.isReset.set(true);
      this.showProgressSpinner.set(false);
      setTimeout(() => this.isReset.set(false), 100);
    }, 200);
  }

  async saveContract(): Promise<boolean> {
    return this.saveEditContract();
  }

  async saveEditContract(withoutUpdateDummy = false): Promise<boolean> {
    if (!this.editContract) {
      return false;
    }

    this.showProgressSpinner.set(true);

    try {
      this.updateDatesFromStruct();

      this.updateHoursFromStruct();

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

        this.toastShowService.showSuccess(
          MessageLibrary.SUCCESS_STORAGE,
          'Success'
        );

        return true;
      }

      return false;
    } catch (error: any) {
      if (this.editContract?.id) {
        await this.readContract(this.editContract.id);
      } else {
        this.createContract();
      }

      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'ContractError'
      );

      if (this.onSaveCompleted) {
        this.onSaveCompleted();
      }

      return false;
    } finally {
      this.showProgressSpinner.set(false);
    }
  }

  async deleteContract(id: string): Promise<boolean> {
    if (!id || id === '') {
      return false;
    }

    this.showProgressSpinner.set(true);

    try {
      await lastValueFrom(this.dataContractService.deleteContract(id));

      this.toastShowService.showSuccess(
        'Contract deleted successfully',
        'Success'
      );

      await this.readContracts();

      if (this.editContract?.id === id) {
        this.createContract();
      }

      return true;
    } catch (error) {
      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'errorDeletingData'
      );
      console.error('Error deleting contract:', error);
      return false;
    } finally {
      this.showProgressSpinner.set(false);
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
      console.log('setTimeStruct - Before transformation:');
      console.log('  guaranteedHoursPerMonth:', value.guaranteedHoursPerMonth);
      console.log('  minimumHoursPerMonth:', value.minimumHoursPerMonth);
      console.log('  maximumHoursPerMonth:', value.maximumHoursPerMonth);
      
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
      
      console.log('setTimeStruct - After transformation:');
      console.log('  internalGuaranteedHours:', value.internalGuaranteedHours);
      console.log('  internalMinimumHours:', value.internalMinimumHours);
      console.log('  internalMaximumHours:', value.internalMaximumHours);
      console.log('  Are they different objects?', 
        value.internalGuaranteedHours !== value.internalMinimumHours,
        value.internalMinimumHours !== value.internalMaximumHours);
    }
  }

  private updateDatesFromStruct() {
    if (!this.editContract) return;

    if (
      this.editContract.internalValidFrom &&
      isNgbDateStructOk(this.editContract.internalValidFrom)
    ) {
      const validFromDate = transformNgbDateStructToDate(
        this.editContract.internalValidFrom
      );
      if (validFromDate) {
        this.editContract.validFrom = validFromDate;
      }
    }

    if (
      this.editContract.internalValidUntil &&
      isNgbDateStructOk(this.editContract.internalValidUntil)
    ) {
      const validUntilDate = transformNgbDateStructToDate(
        this.editContract.internalValidUntil
      );
      if (validUntilDate) {
        this.editContract.validUntil = validUntilDate;
      }
    } else {
      this.editContract.validUntil = undefined;
    }
  }

  private updateHoursFromStruct() {
    if (!this.editContract) return;

    if (
      this.editContract.internalGuaranteedHours &&
      isOwnTimeStructOk(this.editContract.internalGuaranteedHours)
    ) {
      this.editContract.guaranteedHoursPerMonth = transformOwnTimeToNumber(
        this.editContract.internalGuaranteedHours
      );
    }

    if (
      this.editContract.internalMinimumHours &&
      isOwnTimeStructOk(this.editContract.internalMinimumHours)
    ) {
      this.editContract.minimumHoursPerMonth = transformOwnTimeToNumber(
        this.editContract.internalMinimumHours
      );
    }

    if (
      this.editContract.internalMaximumHours &&
      isOwnTimeStructOk(this.editContract.internalMaximumHours)
    ) {
      this.editContract.maximumHoursPerMonth = transformOwnTimeToNumber(
        this.editContract.internalMaximumHours
      );
    }
  }

  private emptyContract(): Contract {
    const contract = new Contract();
    contract.id = undefined;
    contract.name = this.emptyPlaceholder;
    contract.guaranteedHoursPerMonth = 0;
    contract.maximumHoursPerMonth = 0;
    contract.minimumHoursPerMonth = 0;

    contract.internalGuaranteedHours = OwnTime.forDuration('00', '00');
    contract.internalMinimumHours = OwnTime.forDuration('00', '00');
    contract.internalMaximumHours = OwnTime.forDuration('00', '00');
    contract.validFrom = new Date();
    contract.internalValidFrom = transformDateToNgbDateStruct(new Date());
    contract.validUntil = undefined;
    contract.internalValidUntil = undefined;
    contract.calendarSelection = undefined;
    contract.internal = true;
    return contract;
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

  isCurrentContractEmptyPlaceholder(): boolean {
    if (this.editContract?.internal) {
      return this.editContract?.internal === true;
    }
    return false;
  }

  setCurrentContract(contract: IContract) {
    if (!contract) {
      this.createContract();
      return;
    }

    // Clone the contract to avoid reference issues
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

  goBack(): string {
    return '/workplace/settings';
  }

  /* #endregion   Utility methods */
}
