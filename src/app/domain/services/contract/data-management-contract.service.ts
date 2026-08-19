// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { Contract, IContract } from 'src/app/domain/models/contract/contract-class';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection-class';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { DataManagementCalendarSelectionService } from '../calendar/data-management-calendar-selection.service';
import { DataManagementSchedulingRuleService } from '../scheduling/data-management-scheduling-rule.service';
import { DataManagementIndividualPeriodService } from '../scheduling/data-management-individual-period.service';
import { ISchedulingRule } from '../../models/scheduling/scheduling-rule.model';
import { IIndividualPeriod } from '../../models/scheduling/individual-period.model';
import { lastValueFrom } from 'rxjs';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';
import {
  transformNumberToOwnTime,
  transformOwnTimeToNumber,
} from '../../helpers/own-time.helper';
import { TranslateService } from '@ngx-translate/core';
import { OwnTime } from '../../models/schedule/schedule-class';
import { DataManagementSettingsService } from '../settings/data-management-settings.service';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementContractService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private dataContractService = inject(DataContractService);
  private translate = inject(TranslateService);
  private settingsService = inject(DataManagementSettingsService);
  public dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );
  private schedulingRuleService = inject(DataManagementSchedulingRuleService);
  private individualPeriodService = inject(DataManagementIndividualPeriodService);

  constructor() {}

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public onSaveCompleted?: () => void;

  public isReset = signal(false);
  public isRead = signal(false);
  public initIsRead = signal(false);

  public emptyPlaceholder = '<Kein>';
  public contracts: IContract[] = [];
  public editContract: IContract | undefined;

  get guaranteedHoursForBinding(): OwnTime {
    return transformNumberToOwnTime(
      this.editContract?.guaranteedHours || 0,
      true
    );
  }

  set guaranteedHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.guaranteedHours = transformOwnTimeToNumber(value);
    }
  }

  get minimumHoursForBinding(): OwnTime {
    return transformNumberToOwnTime(
      this.editContract?.minimumHours || 0,
      true
    );
  }

  set minimumHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.minimumHours = transformOwnTimeToNumber(value);
    }
  }

  get maximumHoursForBinding(): OwnTime {
    return transformNumberToOwnTime(
      this.editContract?.maximumHours || 0,
      true
    );
  }

  set maximumHoursForBinding(value: OwnTime) {
    if (this.editContract) {
      this.editContract.maximumHours = transformOwnTimeToNumber(value);
    }
  }
  public availableCalendars: ICalendarSelection[] = [];
  public availableSchedulingRules: ISchedulingRule[] = [];
  public availableIndividualPeriods: IIndividualPeriod[] = [];

  private editContractDummy: IContract | undefined;

  /* #region   init */

  async init() {
    this.updateEmptyPlaceholder();
    await this.readContracts();
    await this.loadCalendarSelections();
    await this.loadSchedulingRules();
    await this.loadIndividualPeriods();

    this.translate.onLangChange
      .subscribe(() => {
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

  private async loadSchedulingRules(): Promise<void> {
    try {
      this.availableSchedulingRules = await this.schedulingRuleService.readSelectableRules();
    } catch (error) {
      console.error('Error loading scheduling rules:', error);
      this.availableSchedulingRules = [];
    }
  }

  /**
   * Makes sure a rule already assigned to a contract stays selectable even when the active-industries
   * filter no longer returns it. Without this the edit form shows "no rule" for a contract that does
   * have one, and saving that form silently clears the assignment.
   * @param schedulingRuleId - Rule referenced by the contract being edited
   * @returns The rule that had to be pulled in because the filter excluded it, otherwise undefined
   */
  public async ensureAssignedSchedulingRuleIsSelectable(
    schedulingRuleId: string | undefined
  ): Promise<ISchedulingRule | undefined> {
    if (!schedulingRuleId) {
      return undefined;
    }
    if (this.availableSchedulingRules.some((rule) => rule.id === schedulingRuleId)) {
      return undefined;
    }

    const assigned = await this.schedulingRuleService.readRuleById(schedulingRuleId);
    if (!assigned) {
      return undefined;
    }

    this.availableSchedulingRules = [...this.availableSchedulingRules, assigned];
    return assigned;
  }

  public async loadIndividualPeriods(): Promise<void> {
    try {
      this.availableIndividualPeriods = await this.individualPeriodService.readSelectableIndividualPeriods();
    } catch (error) {
      console.error('Error loading individual periods:', error);
      this.availableIndividualPeriods = [];
    }
  }

  fireIsReadEvent() {
    this.isRead.set(true);
    resetSignalAfterDelay(this.isRead);
  }

  /* #endregion   init */

  /* #region   Contract CRUD operations */

  async readContracts(): Promise<IContract[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataContractService.getList());

      this.contracts = [];

      if (result && Array.isArray(result)) {
        for (const contract of result) {
          contract.nightRate = (contract.nightRate ?? 0) * 100;
          contract.holidayRate = (contract.holidayRate ?? 0) * 100;
          contract.we1Rate = contract.we1Rate == null ? null : contract.we1Rate * 100;
          contract.we2Rate = contract.we2Rate == null ? null : contract.we2Rate * 100;
          contract.we3Rate = contract.we3Rate == null ? null : contract.we3Rate * 100;
        }
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
        result.nightRate = (result.nightRate ?? 0) * 100;
        result.holidayRate = (result.holidayRate ?? 0) * 100;
        result.we1Rate = result.we1Rate == null ? null : result.we1Rate * 100;
        result.we2Rate = result.we2Rate == null ? null : result.we2Rate * 100;
        result.we3Rate = result.we3Rate == null ? null : result.we3Rate * 100;
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
    const sched = this.settingsService.appSettings.schedulingDefaultSettings();
    const work = this.settingsService.appSettings.workSettings();
    newContract.guaranteedHours = undefined;
    newContract.maximumHours = sched.maximumHours;
    newContract.minimumHours = sched.minimumHours;
    newContract.fullTime = sched.fullTime;
    newContract.nightRate = this.settingsService.nightRate;
    newContract.holidayRate = this.settingsService.holidayRate;
    newContract.we1Rate = this.settingsService.saRate;
    newContract.we2Rate = this.settingsService.soRate;
    newContract.we3Rate = this.settingsService.appSettings.surchargeModeSettings().we3Rate * 100;
    newContract.nightStart = this.settingsService.appSettings.surchargeModeSettings().nightStart;
    newContract.nightEnd = this.settingsService.appSettings.surchargeModeSettings().nightEnd;
    newContract.paymentInterval = work.paymentInterval;
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

    if (!withoutUpdateDummy) {
      this.editContractDummy = cloneObject<IContract>(this.editContract);
    }

    setTimeout(() => {
      this.isReset.set(true);
      this._showProgressSpinner.set(false);
      resetSignalAfterDelay(this.isReset);
    }, 200);
  }

  public prepareContractForEdit(contract: IContract): void {
    if (contract.calendarSelectionId && !contract.calendarSelection) {
      contract.calendarSelection = this.availableCalendars.find(
        (cal) => cal.id === contract.calendarSelectionId
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
      const contractToSave = { ...this.editContract };
      contractToSave.nightRate = (contractToSave.nightRate ?? 0) / 100;
      contractToSave.holidayRate = (contractToSave.holidayRate ?? 0) / 100;
      contractToSave.we1Rate = contractToSave.we1Rate == null ? null : contractToSave.we1Rate / 100;
      contractToSave.we2Rate = contractToSave.we2Rate == null ? null : contractToSave.we2Rate / 100;
      contractToSave.we3Rate = contractToSave.we3Rate == null ? null : contractToSave.we3Rate / 100;

      const action = contractToSave.id
        ? this.dataContractService.updateContract(contractToSave)
        : this.dataContractService.addContract(contractToSave);

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

    const guaranteedHours = this.editContract.guaranteedHours;
    const guaranteedHoursOk =
      guaranteedHours == null ||
      (guaranteedHours >= 0 &&
        guaranteedHours <= this.editContract.maximumHours &&
        guaranteedHours >= this.editContract.minimumHours);

    if (
      this.editContract.name &&
      this.editContract.name.trim() !== '' &&
      this.editContract.name !== this.emptyPlaceholder &&
      this.editContract.validFrom &&
      guaranteedHoursOk &&
      this.editContract.maximumHours >= 0 &&
      this.editContract.minimumHours >= 0 &&
      this.editContract.minimumHours <=
        this.editContract.maximumHours
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

    if (contract.guaranteedHours != null && contract.guaranteedHours < 0) {
      errors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedHoursNegative'
        )
      );
    }

    if (contract.maximumHours < 0) {
      errors.push(
        this.translate.instant('setting.contract.validation.maxHoursNegative')
      );
    }

    if (contract.minimumHours < 0) {
      errors.push(
        this.translate.instant('setting.contract.validation.minHoursNegative')
      );
    }

    if (contract.minimumHours > contract.maximumHours) {
      errors.push(
        this.translate.instant('setting.contract.validation.minGreaterThanMax')
      );
    }

    if (
      contract.guaranteedHours != null &&
      contract.guaranteedHours > contract.maximumHours
    ) {
      errors.push(
        this.translate.instant(
          'setting.contract.validation.guaranteedGreaterThanMax'
        )
      );
    }

    if (
      contract.guaranteedHours != null &&
      contract.guaranteedHours < contract.minimumHours
    ) {
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
