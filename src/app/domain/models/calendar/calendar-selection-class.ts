// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISelectedCalendar } from './selected-calendar.interface';
import { ICalendarSelection } from './calendar-selection.interface';

export class CalendarSelection implements ICalendarSelection {
  id: string | undefined = '';
  name = '';
  isSeeded = false;
  selectedCalendars: ISelectedCalendar[] = [];
  internal: boolean | undefined = undefined;
}
