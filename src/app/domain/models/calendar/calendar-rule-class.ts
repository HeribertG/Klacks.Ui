// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';
import { ICalendarRule } from './calendar-rule.interface';

export class CalendarRule implements ICalendarRule {
  id = '';
  name?: MultiLanguage | undefined = undefined;
  description?: MultiLanguage | undefined = undefined;
  rule = '';
  subRule = '';
  isMandatory = true;
  isPaid = true;
  state = '';
  country = '';
}
