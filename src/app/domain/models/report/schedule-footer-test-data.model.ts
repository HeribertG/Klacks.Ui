// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PropertyMetadata } from '../shift/property-metadata.type';

export class ScheduleFooterTestData {
  totalRows = 20;
  totalHours = 160;
  totalSurcharges = 10;
  totalWorkDays = 20;
  totalExpenses = 500;

  static metadata: PropertyMetadata = {
    totalRows: { min: 0, max: 10000, decimals: 0 },
    totalHours: { min: 0, max: 10000, decimals: 2 },
    totalSurcharges: { min: 0, max: 10000, decimals: 2 },
    totalWorkDays: { min: 0, max: 365, decimals: 0 },
    totalExpenses: { min: 0, max: 1000000, decimals: 2 },
  };
}
