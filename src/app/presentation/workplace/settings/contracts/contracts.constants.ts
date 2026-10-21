// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the contracts settings card and its contract dialog.
 * @param CONTRACT_NAME_DEBOUNCE_MS - Debounce of the contract name field of the signal form
 * @param MIN_RATE_PERCENT - Lowest explicit surcharge rate in percent
 * @param MAX_RATE_PERCENT - Highest explicit surcharge rate in percent
 * @param FULL_WORKLOAD_PERCENT - Workload percent that leaves the inherited guaranteed hours unscaled
 * @param CONTRACTS_DELETE_CONTEXT - componentContext of the shared delete modal owned by this card
 * @param CONTRACT_LIST_SCROLL_DELAY_MS - Delay before the list scrolls to a newly saved contract
 * @param CONTRACT_DIALOG_OPTIONS - NgbModal options of the contract dialog
 * @param SHIFT_WORK_TOOLTIP_KEYS - Translation keys of the three shift-work states
 * @param PAYMENT_INTERVAL_OPTIONS - Payment intervals offered in the dialog, in display order
 * @param PAYMENT_INTERVAL_LABEL_KEYS - Translation key per payment interval
 * @param CONTRACT_SELECTION_KEYS - Translation keys of the empty and inactive selector labels
 */

import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';

export const CONTRACT_NAME_DEBOUNCE_MS = 300;

export const MIN_RATE_PERCENT = 0;

export const MAX_RATE_PERCENT = 100;

export const FULL_WORKLOAD_PERCENT = 100;

export const CONTRACTS_DELETE_CONTEXT = 'contracts';

export const CONTRACT_LIST_SCROLL_DELAY_MS = 100;

export const CONTRACT_DIALOG_OPTIONS: Readonly<NgbModalOptions> = {
  ariaLabelledBy: 'modal-title',
  size: 'lg',
};

export const SHIFT_WORK_TOOLTIP_KEYS = {
  unset: 'setting.contract.performsShiftWork-unset',
  enabled: 'setting.contract.performsShiftWork-enabled',
  disabled: 'setting.contract.performsShiftWork-disabled',
} as const;

export const PAYMENT_INTERVAL_OPTIONS: readonly PaymentInterval[] = [
  PaymentInterval.Weekly,
  PaymentInterval.Biweekly,
  PaymentInterval.Monthly,
  PaymentInterval.Individual,
  PaymentInterval.MonthlyTargetHours,
];

export const PAYMENT_INTERVAL_LABEL_KEYS: Readonly<Record<PaymentInterval, string>> = {
  [PaymentInterval.Weekly]: 'settings.work.payment-weekly',
  [PaymentInterval.Biweekly]: 'settings.work.payment-biweekly',
  [PaymentInterval.Monthly]: 'settings.work.payment-monthly',
  [PaymentInterval.Individual]: 'settings.work.payment-individual',
  [PaymentInterval.MonthlyTargetHours]: 'settings.work.payment-monthly-target-hours',
};

export const CONTRACT_SELECTION_KEYS = {
  noCalendar: 'setting.contract.noCalendar',
  noSchedulingRule: 'setting.contract.noSchedulingRule',
  noIndividualPeriod: 'setting.contract.noIndividualPeriod',
  schedulingRuleInactiveIndustry: 'setting.contract.schedulingRuleInactiveIndustry',
} as const;
