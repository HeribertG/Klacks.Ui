// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';

export const REPORT_MAX_ROWS = 10000;

export const WEEKDAY_LABEL_KEYS: readonly string[] = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export const PAYMENT_INTERVAL_LABEL_KEYS: Readonly<Record<PaymentInterval, string>> = {
  [PaymentInterval.Weekly]: 'settings.work.payment-weekly',
  [PaymentInterval.Biweekly]: 'settings.work.payment-biweekly',
  [PaymentInterval.Monthly]: 'settings.work.payment-monthly',
  [PaymentInterval.Individual]: 'settings.work.payment-individual',
  [PaymentInterval.MonthlyTargetHours]: 'settings.work.payment-monthly-target-hours',
};

export const FULL_LIST_PAGINATION = {
  numberOfItemsPerPage: REPORT_MAX_ROWS,
  requiredPage: 0,
  numberOfItemOnPreviousPage: undefined,
  firstItemOnLastPage: undefined,
  isPreviousPage: undefined,
  isNextPage: undefined,
} as const;
