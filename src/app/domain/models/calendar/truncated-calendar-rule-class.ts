// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseTruncated } from '../base-truncated-class';
import { ITruncatedCalendarRule } from './truncated-calendar-rule.interface';
import { CalendarRule } from './calendar-rule-class';

export class TruncatedCalendarRule
  extends BaseTruncated
  implements ITruncatedCalendarRule
{
  calendarRules: CalendarRule[] = [];
}
