// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';
import { ICountry } from './i-country';

export class Country implements ICountry {
  id = '';
  abbreviation = '';
  name?: MultiLanguage | undefined = undefined;
  prefix = '';
  select = false;
  isDirty = 0;
}
