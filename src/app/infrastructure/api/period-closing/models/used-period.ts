// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Billing period that is actually populated with non-deleted work or break
 * entries on a non-deleted client. Drives the period dropdown in the
 * period-closing UI.
 */
export interface UsedPeriod {
  startDate: string;
  endDate: string;
  paymentInterval: number;
}
