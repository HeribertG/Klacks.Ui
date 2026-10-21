// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseFilter } from '../base-filter.interface';
import { StateCountryToken } from './state-country-token-class';

export interface ICalendarRulesFilter extends IBaseFilter {
  list: StateCountryToken[];
  language: string | undefined;
}
