// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Billing period with optional group scope.
 * Drives the period dropdown in the period-closing UI.
 * @param startDate - ISO date string for period start
 * @param endDate - ISO date string for period end
 * @param paymentInterval - 0=Weekly, 1=Biweekly, 2=Monthly, 3=Individual
 * @param groupId - Optional group ID from GroupItem association
 * @param groupName - Optional group display name
 */
export interface UsedPeriod {
  startDate: string;
  endDate: string;
  paymentInterval: number;
  groupId: string | null;
  groupName: string | null;
}
