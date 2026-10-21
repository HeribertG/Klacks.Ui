// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseFilter } from '../base-filter-class';
import { ICalendarRulesFilter } from './calendar-rules-filter.interface';
import { StateCountryToken } from './state-country-token-class';
import { DomainMessages } from 'src/app/domain/constants/messages';

export class CalendarRulesFilter
  extends BaseFilter
  implements ICalendarRulesFilter
{
  list: StateCountryToken[] = [];
  language = DomainMessages.DEFAULT_LANG;
  countries: string[] = [];
}
