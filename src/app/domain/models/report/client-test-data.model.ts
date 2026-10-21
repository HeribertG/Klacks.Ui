// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PropertyMetadata } from '../shift/shift-data-class';

export class ClientTestData {
  idNumber = 1001;
  name = 'Muster';
  firstName = 'Max';
  company = 'Firma AG';
  birthdate = '1990-01-15';
  gender = 0;

  static metadata: PropertyMetadata = {
    idNumber: { min: 0, max: 999999, decimals: 0 },
    gender: { min: 0, max: 1, decimals: 0 },
  };
}
