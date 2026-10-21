// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface WorkSettingsFormModel {
  vacationDaysPerYear: number;
  probationPeriod: number;
  noticePeriod: number;
  paymentInterval: string;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
  dayVisibleBefore: number;
  dayVisibleAfter: number;
}
