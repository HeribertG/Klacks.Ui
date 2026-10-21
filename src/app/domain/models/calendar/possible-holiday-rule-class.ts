// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICalendarRule } from './calendar-rule.interface';

export class PossibleHolidayRule {
  country = '';
  state = '';
  selected = false;
  rule: ICalendarRule | undefined = undefined;
}
