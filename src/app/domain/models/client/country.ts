// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
