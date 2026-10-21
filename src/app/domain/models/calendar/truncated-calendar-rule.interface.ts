// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseTruncated } from '../base-truncated.interface';
import { CalendarRule } from './calendar-rule-class';

export interface ITruncatedCalendarRule extends IBaseTruncated {
  calendarRules: CalendarRule[];
}
