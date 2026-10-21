// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IWorkScheduleFilter {
  startDate: string;
  endDate: string;
  /** Core payment-period start (without DayVisibleBefore padding). Used for period-hours calculation. */
  periodStartDate?: string;
  /** Core payment-period end (without DayVisibleAfter padding). Used for period-hours calculation. */
  periodEndDate?: string;
  selectedGroup?: string;
  searchString?: string;
  orderBy?: string;
  sortOrder?: string;
  showEmployees?: boolean;
  showExtern?: boolean;
  individualSort?: boolean;
  startRow?: number;
  rowCount?: number;
  paymentInterval?: number;
  analyseToken?: string;
  /** Optional single-client scope; backend skips pagination when set so the targeted client always surfaces. */
  clientId?: string;
  /** Optional multi-client scope for bulk refresh; backend skips pagination and returns only the listed clients. */
  clientIds?: string[];
}
