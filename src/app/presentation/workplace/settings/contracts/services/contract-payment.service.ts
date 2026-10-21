// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Payment interval, workload percent and individual period of the contract dialog.
 * @param paymentIntervalOptions - Payment intervals offered in the dropdown, in display order
 * @param showPercentField - True for target-hours contracts and while the guaranteed hours are inherited
 */

import { computed, inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import {
  CONTRACT_SELECTION_KEYS,
  PAYMENT_INTERVAL_LABEL_KEYS,
  PAYMENT_INTERVAL_OPTIONS,
} from '../contracts.constants';
import { ContractEditorStateService } from './contract-editor-state.service';

@Injectable()
export class ContractPaymentService {
  private readonly state = inject(ContractEditorStateService);
  private readonly translate = inject(TranslateService);
  private readonly dataManagementContractService = inject(DataManagementContractService);

  readonly paymentIntervalOptions = PAYMENT_INTERVAL_OPTIONS;

  readonly showPercentField = computed(
    () =>
      this.state.paymentInterval() === PaymentInterval.MonthlyTargetHours ||
      this.state.guaranteedHoursInherited()
  );

  getPaymentIntervalLabel(value?: PaymentInterval): string {
    const interval = value ?? this.state.paymentInterval();
    return this.translate.instant(PAYMENT_INTERVAL_LABEL_KEYS[interval]);
  }

  onPaymentIntervalChange(value: PaymentInterval): void {
    this.state.paymentInterval.set(value);
    if (this.state.editingContract) {
      this.state.editingContract.paymentInterval = value;
    }
    if (value !== PaymentInterval.Individual) {
      this.state.individualPeriodId.set(undefined);
      if (this.state.editingContract) {
        this.state.editingContract.individualPeriodId = undefined;
      }
    }
    if (value !== PaymentInterval.MonthlyTargetHours && !this.state.guaranteedHoursInherited()) {
      this.state.percent.set(undefined);
      if (this.state.editingContract) {
        this.state.editingContract.percent = undefined;
      }
    }
  }

  onPercentChange(value: number | string | null | undefined): void {
    const parsed = value === null || value === undefined || value === '' ? undefined : Number(value);
    this.state.percent.set(parsed);
    if (this.state.editingContract) {
      this.state.editingContract.percent = parsed;
    }
  }

  onIndividualPeriodSelectionChange(id: string): void {
    this.state.individualPeriodId.set(id || undefined);
    if (this.state.editingContract) {
      this.state.editingContract.individualPeriodId = id || undefined;
    }
  }

  getSelectedIndividualPeriodName(): string {
    const selectedId = this.state.individualPeriodId();
    if (!selectedId) {
      return this.translate.instant(CONTRACT_SELECTION_KEYS.noIndividualPeriod);
    }
    const period = this.dataManagementContractService.availableIndividualPeriods.find(
      (p) => p.id === selectedId
    );
    return period?.name || this.translate.instant(CONTRACT_SELECTION_KEYS.noIndividualPeriod);
  }
}
