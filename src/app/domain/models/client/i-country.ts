// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { MultiLanguage } from '../translation/multi-language-class';

export interface ICountry {
  id: string | undefined;
  abbreviation: string;
  name?: MultiLanguage | undefined;
  prefix: string;
  select: boolean;
  isDirty: number;
}
