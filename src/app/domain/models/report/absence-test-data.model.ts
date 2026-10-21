// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PropertyMetadata } from '../shift/property-metadata.type';

export class AbsenceTestData {
  fromDate = '2025-01-01';
  untilDate = '2025-01-05';
  absenceName = 'Ferien';
  defaultValue = 1;
  clientName = 'Muster';
  clientFirstName = 'Max';

  static metadata: PropertyMetadata = {
    defaultValue: { min: 0, max: 100, decimals: 2 },
  };
}
