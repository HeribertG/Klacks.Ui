// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CalendarSelection } from './calendar-selection-class';

export interface ISelectedCalendar {
  id: string | undefined;
  calendarSelection: CalendarSelection | undefined;
  country: string;
  state: string;
  officialOverride: boolean | null;
}
