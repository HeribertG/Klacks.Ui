import { inject, Injectable, signal } from '@angular/core';
import { Contract, IContract } from 'src/app/domain/models/contract-class';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataContractService } from 'src/app/infrastructure/api/data-contract.service';
import { lastValueFrom } from 'rxjs';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/domain/helpers/object-helpers';
import {
  transformDateToNgbDateStruct,
  transformNumberToOwnTime,
} from '../helpers/format-helper';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class DataManagementContractService {
  public toastShowService = inject(ToastShowService);
  private dataContractService = inject(DataContractService);
  private translate = inject(TranslateService);

  public isRead = signal(false);
  public isChanged = signal(false);
  public isNew = signal<Contract | undefined>(undefined);

  public editContract: IContract | undefined = this.emptyContract();
  public emptyPlaceholder = '<Kein>';
  public contracts: IContract[] = [];

  private editContractDummy: IContract | undefined;

  constructor() {
    this.contracts.push(this.emptyContract());

    this.translate.onLangChange.subscribe(() => {
      this.updateEmptyPlaceholder();
    });

    this.updateEmptyPlaceholder();
  }

  setCurrentOnEmpty() {
    this.editContract = this.emptyContract();
  }

  isCurrentContractEmptyPlaceholder(): boolean {
    if (this.editContract?.internal) {
      return this.editContract?.internal === true;
    }
    return false;
  }

  private emptyContract(): Contract {
    return {
      id: undefined,
      name: this.emptyPlaceholder,
      guaranteedHoursPerMonth: 0,
      maximumHoursPerMonth: 0,
      minimumHoursPerMonth: 0,
      internalGuaranteedHours: transformNumberToOwnTime(0, true),
      internalMinimumHours: transformNumberToOwnTime(0, true),
      internalMaximumHours: transformNumberToOwnTime(0, true),
      validFrom: new Date(),
      internalValidFrom: transformDateToNgbDateStruct(new Date()),
      validUntil: undefined,
      internalValidUntil: undefined,
      calendarSelection: undefined,
      internal: true,
    };
  }

  async readContracts() {
    try {
      const result = await lastValueFrom(this.dataContractService.getList());

      this.contracts = [this.emptyContract()];

      if (result && Array.isArray(result)) {
        this.contracts.push(...result);
      }

      this.isRead.set(true);

      return this.contracts;
    } catch (error) {
      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'errorLoadingData'
      );
      console.error('Error loading contracts:', error);
      return [];
    }
  }

  async readContract(id: string): Promise<IContract | undefined> {
    try {
      if (!id || id === '') {
        return undefined;
      }

      const result = await lastValueFrom(
        this.dataContractService.getContract(id)
      );

      if (result) {
        this.editContract = result;
        return result;
      }

      return undefined;
    } catch (error) {
      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'errorLoadingData'
      );
      console.error('Error loading contract:', error);
      return undefined;
    }
  }

  async saveContract(): Promise<boolean> {
    if (!this.editContract) {
      return false;
    }

    try {
      const contractToSave = new Contract();
      Object.assign(contractToSave, this.editContract);

      let result: IContract;

      if (!contractToSave.id || contractToSave.id === '') {
        // New contract
        result = await lastValueFrom(
          this.dataContractService.addContract(contractToSave)
        );
        this.isNew.set(undefined);
      } else {
        // Update existing contract
        result = await lastValueFrom(
          this.dataContractService.updateContract(contractToSave)
        );
      }

      if (result) {
        this.editContract = result;
        this.isChanged.set(false);
        this.toastShowService.showSuccess(
          MessageLibrary.SUCCESS_STORAGE,
          'Success'
        );
        await this.readContracts(); // Refresh the list
        return true;
      }

      return false;
    } catch (error) {
      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'errorSavingData'
      );
      console.error('Error saving contract:', error);
      return false;
    }
  }

  async deleteContract(id: string): Promise<boolean> {
    if (!id || id === '') {
      return false;
    }

    try {
      await lastValueFrom(this.dataContractService.deleteContract(id));

      this.toastShowService.showSuccess(
        'Contract deleted successfully',
        'Success'
      );
      await this.readContracts(); // Refresh the list

      // Reset current contract if it was deleted
      if (this.editContract?.id === id) {
        this.setCurrentOnEmpty();
      }

      return true;
    } catch (error) {
      this.toastShowService.showError(
        MessageLibrary.UNKNOWN_ERROR,
        'errorDeletingData'
      );
      console.error('Error deleting contract:', error);
      return false;
    }
  }

  createNewContract(): Contract {
    const newContract = new Contract();
    newContract.id = '';
    newContract.name = '';
    newContract.guaranteedHoursPerMonth = 160; // Default value
    newContract.maximumHoursPerMonth = 200; // Default value
    newContract.minimumHoursPerMonth = 120; // Default value
    newContract.validFrom = new Date();
    newContract.validUntil = undefined;
    newContract.calendarSelection = undefined;
    newContract.internal = false;

    this.editContract = newContract;
    this.isNew.set(newContract);
    this.isChanged.set(true);

    return newContract;
  }

  setCurrentContract(contract: IContract) {
    if (!contract) {
      this.setCurrentOnEmpty();
      return;
    }

    this.editContract = cloneObject(contract);
    this.isChanged.set(false);
  }

  updateCurrentContract(updates: Partial<IContract>) {
    if (!this.editContract) {
      return;
    }

    const originalContract = cloneObject(this.editContract);
    Object.assign(this.editContract, updates);

    // Check if data has changed
    const hasChanged = !compareComplexObjects(
      originalContract,
      this.editContract
    );
    this.isChanged.set(hasChanged);
  }

  validateContract(contract: IContract): string[] {
    const errors: string[] = [];

    if (!contract.name || contract.name.trim() === '') {
      errors.push('Contract name is required');
    }

    if (contract.guaranteedHoursPerMonth < 0) {
      errors.push('Guaranteed hours per month cannot be negative');
    }

    if (contract.maximumHoursPerMonth < 0) {
      errors.push('Maximum hours per month cannot be negative');
    }

    if (contract.minimumHoursPerMonth < 0) {
      errors.push('Minimum hours per month cannot be negative');
    }

    if (contract.minimumHoursPerMonth > contract.maximumHoursPerMonth) {
      errors.push('Minimum hours cannot be greater than maximum hours');
    }

    if (contract.guaranteedHoursPerMonth > contract.maximumHoursPerMonth) {
      errors.push('Guaranteed hours cannot be greater than maximum hours');
    }

    if (contract.guaranteedHoursPerMonth < contract.minimumHoursPerMonth) {
      errors.push('Guaranteed hours cannot be less than minimum hours');
    }

    if (!contract.validFrom) {
      errors.push('Valid from date is required');
    }

    if (
      contract.validUntil &&
      contract.validFrom &&
      contract.validUntil <= contract.validFrom
    ) {
      errors.push('Valid until date must be after valid from date');
    }

    return errors;
  }

  isContractValid(): boolean {
    if (!this.editContract) {
      return false;
    }

    const errors = this.validateContract(this.editContract);
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
    if (!this.editContract) {
      return ['No contract selected'];
    }

    return this.validateContract(this.editContract);
  }

  resetCurrentContract() {
    this.editContract = this.emptyContract();
    this.isChanged.set(false);
    this.isNew.set(undefined);
  }

  hasUnsavedChanges(): boolean {
    return this.isChanged();
  }

  isNewContract(): boolean {
    return this.isNew() !== undefined;
  }

  private updateEmptyPlaceholder(): void {
    this.emptyPlaceholder = this.translate.instant('none');
  }
}
