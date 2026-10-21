// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PropertyMetadata } from '../shift/property-metadata.type';

export class ScheduleExpensesTestData {
  amount = 100;
  taxable = true;
  description = '';

  static metadata: PropertyMetadata = {
    amount: { min: 0, max: 100000, decimals: 2, step: 1 },
  };
}
