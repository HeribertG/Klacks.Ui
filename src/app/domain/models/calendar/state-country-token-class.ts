// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';

export class StateCountryToken {
  id = '';
  country = '';
  countryName: MultiLanguage = new MultiLanguage();
  state = '';
  stateName: MultiLanguage = new MultiLanguage();
  select = false;
}
