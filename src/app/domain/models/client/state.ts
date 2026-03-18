// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { MultiLanguage } from '../translation/multi-language-class';
import { IState } from './i-state';

export class State implements IState {
  id = '';
  abbreviation = '';
  name?: MultiLanguage | undefined = undefined;
  countryPrefix = '';
  prefix = '';
  select = false;
  isDirty = 0;
}
