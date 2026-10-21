// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PropertyMetadata } from '../shift/property-metadata.type';

export class ClientFooterTestData {
  totalRows = 50;

  static metadata: PropertyMetadata = {
    totalRows: { min: 0, max: 10000, decimals: 0 },
  };
}
