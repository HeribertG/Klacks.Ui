// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISelectedCalendar } from './selected-calendar.interface';
import { CalendarSelection } from './calendar-selection-class';

export class SelectedCalendar implements ISelectedCalendar {
  id: string | undefined = '';
  calendarSelection: CalendarSelection | undefined = undefined;
  country = '';
  state = '';
  officialOverride: boolean | null = null;
}
