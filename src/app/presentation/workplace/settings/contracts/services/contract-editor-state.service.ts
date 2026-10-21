// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Editor state of the contract dialog: the contract being edited, its signal form and the field signals
 * the dialog sections read and write, plus the mapping between those signals and the contract.
 * @param editingContract - Working copy shown in the dialog
 * @param originalContract - Listed contract the working copy is saved onto, null for a new contract
 * @param isNewContract - True while the dialog edits a contract that has not been saved yet
 * @param contractForm - Signal form of the name, the five surcharge rates and the night window
 */

import { effect, inject, Injectable, Injector, signal } from '@angular/core';
import { debounce, form } from '@angular/forms/signals';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { IContract } from 'src/app/domain/models/contract/contract.interface';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { CONTRACT_RATE_KEYS, normalizeRateInput } from 'src/app/domain/helpers/contract-rate.helper';
import {
  transformNullableNumberToOwnTime,
  transformNumberToOwnTime,
  transformOwnTimeToNumber,
} from 'src/app/domain/helpers/own-time.helper';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/presentation/helpers/ngb-date.helper';
import { ContractFormModel } from '../contract-form-model.interface';
import { CONTRACT_NAME_DEBOUNCE_MS, MAX_RATE_PERCENT, MIN_RATE_PERCENT } from '../contracts.constants';

const clampRate = (value: number | null): number | null =>
  value == null ? null : Math.max(MIN_RATE_PERCENT, Math.min(MAX_RATE_PERCENT, value));

@Injectable()
export class ContractEditorStateService {
  private readonly injector = inject(Injector);
  private readonly dataManagementContractService = inject(DataManagementContractService);

  editingContract: IContract | null = null;
  originalContract: IContract | null = null;
  isNewContract = false;

  private readonly formModel = signal<ContractFormModel>({
    name: '',
    nightRate: null,
    holidayRate: null,
    we1Rate: null,
    we2Rate: null,
    we3Rate: null,
    nightStart: '',
    nightEnd: '',
  });

  readonly contractForm = form(this.formModel, f => {
    debounce(f.name, CONTRACT_NAME_DEBOUNCE_MS);
  });

  readonly performsShiftWork = signal<boolean | null>(null);
  readonly guaranteedHours = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  readonly guaranteedHoursInherited = signal<boolean>(false);
  readonly minimumHours = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  readonly maximumHours = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  readonly fullTime = signal<OwnTime>(OwnTime.forDuration('00', '00'));
  readonly validFrom = signal<NgbDateStruct | null | undefined>(undefined);
  readonly validUntil = signal<NgbDateStruct | null | undefined>(undefined);
  readonly calendarSelectionId = signal<string | undefined>(undefined);
  readonly schedulingRuleId = signal<string | undefined>(undefined);
  readonly schedulingRuleOptions = signal<ISchedulingRule[]>([]);
  readonly ruleIdOutsideActiveIndustries = signal<string | undefined>(undefined);
  readonly individualPeriodId = signal<string | undefined>(undefined);
  readonly paymentInterval = signal<PaymentInterval>(PaymentInterval.Monthly);
  readonly percent = signal<number | undefined>(undefined);

  /**
   * Starts the rate clamp effect in the injection context of the contracts card.
   */
  connect(): void {
    effect(() => {
      const current = this.formModel();
      const clamped = { ...current };
      for (const key of CONTRACT_RATE_KEYS) {
        clamped[key] = clampRate(normalizeRateInput(current[key]));
      }
      if (CONTRACT_RATE_KEYS.some(key => clamped[key] !== current[key])) {
        this.formModel.set(clamped);
      }
    }, { injector: this.injector });
  }

  /**
   * Fills the form and the field signals from the contract the dialog opens.
   * @param contract - Contract shown in the dialog
   */
  load(contract: IContract): void {
    this.formModel.set({
      name: contract.name || '',
      nightRate: contract.nightRate ?? null,
      holidayRate: contract.holidayRate ?? null,
      we1Rate: contract.we1Rate ?? null,
      we2Rate: contract.we2Rate ?? null,
      we3Rate: contract.we3Rate ?? null,
      nightStart: contract.nightStart ?? '',
      nightEnd: contract.nightEnd ?? '',
    });
    this.performsShiftWork.set(contract.performsShiftWork ?? null);
    this.guaranteedHoursInherited.set(contract.guaranteedHours == null);
    this.guaranteedHours.set(transformNullableNumberToOwnTime(contract.guaranteedHours, true));
    this.minimumHours.set(transformNumberToOwnTime(contract.minimumHours ?? 0, true));
    this.maximumHours.set(transformNumberToOwnTime(contract.maximumHours ?? 0, true));
    this.fullTime.set(transformNumberToOwnTime(contract.fullTime ?? 0, true));
    this.validFrom.set(contract.validFrom ? transformDateToNgbDateStruct(contract.validFrom) : undefined);
    this.validUntil.set(contract.validUntil ? transformDateToNgbDateStruct(contract.validUntil) : undefined);
    this.calendarSelectionId.set(contract.calendarSelectionId);
    this.schedulingRuleId.set(contract.schedulingRuleId);
    void this.refreshSchedulingRuleOptions(contract.schedulingRuleId);
    this.individualPeriodId.set(contract.individualPeriodId);
    this.paymentInterval.set(contract.paymentInterval);
    this.percent.set(contract.percent);
  }

  /**
   * Writes the form and the field signals onto the contract being edited.
   */
  applyToContract(): void {
    if (!this.editingContract) return;
    const formData = this.formModel();
    this.editingContract.name = formData.name;
    for (const key of CONTRACT_RATE_KEYS) {
      this.editingContract[key] = clampRate(normalizeRateInput(formData[key]));
    }
    this.editingContract.nightStart = formData.nightStart || null;
    this.editingContract.nightEnd = formData.nightEnd || null;
    this.editingContract.performsShiftWork = this.performsShiftWork();
    this.editingContract.guaranteedHours = this.guaranteedHoursInherited()
      ? undefined
      : transformOwnTimeToNumber(this.guaranteedHours());
    this.editingContract.minimumHours = transformOwnTimeToNumber(this.minimumHours());
    this.editingContract.maximumHours = transformOwnTimeToNumber(this.maximumHours());
    this.editingContract.fullTime = transformOwnTimeToNumber(this.fullTime());
    const validFromValue = this.validFrom();
    if (validFromValue) {
      const validFromDate = transformNgbDateStructToDate(validFromValue);
      if (validFromDate) {
        this.editingContract.validFrom = validFromDate;
      }
    }
    const validUntilValue = this.validUntil();
    this.editingContract.validUntil = validUntilValue
      ? transformNgbDateStructToDate(validUntilValue)
      : undefined;
    this.editingContract.paymentInterval = this.paymentInterval();
    this.editingContract.percent = this.percent();
  }

  isFormValid(): boolean {
    if (!this.editingContract) return false;
    this.applyToContract();
    return this.dataManagementContractService.validateContract(
      this.editingContract
    ).length === 0;
  }

  getValidationErrors(): string[] {
    if (!this.editingContract) return [];
    this.applyToContract();
    return this.dataManagementContractService.validateContract(
      this.editingContract
    );
  }

  /**
   * Keeps the rule a contract already references selectable. Once its industry is deactivated the
   * filtered list no longer contains it, and showing "no rule" would make the next save drop the
   * assignment without anyone noticing.
   * @param assignedRuleId - Rule referenced by the contract being opened
   */
  private async refreshSchedulingRuleOptions(assignedRuleId: string | undefined): Promise<void> {
    const pulledIn =
      await this.dataManagementContractService.ensureAssignedSchedulingRuleIsSelectable(assignedRuleId);
    this.ruleIdOutsideActiveIndustries.set(pulledIn?.id);
    this.schedulingRuleOptions.set([
      ...this.dataManagementContractService.availableSchedulingRules,
    ]);
  }
}
