// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PropertyMetadata } from '../shift/property-metadata.type';

export class AbsenceFooterTestData {
  totalRows = 10;
  totalValue = 7.5;

  static metadata: PropertyMetadata = {
    totalRows: { min: 0, max: 10000, decimals: 0 },
    totalValue: { min: 0, max: 10000, decimals: 2 },
  };
}
