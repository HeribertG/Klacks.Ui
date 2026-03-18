// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { MultiLanguage } from '../translation/multi-language-class';

export interface IState {
  id: string | undefined;
  abbreviation: string;
  name?: MultiLanguage | undefined;
  countryPrefix: string;
  prefix: string;
  select: boolean;
  isDirty: number;
}
