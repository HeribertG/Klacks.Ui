// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISelectedCalendar } from './selected-calendar.interface';

export interface ICalendarSelection {
  id: string | undefined;
  name: string;
  isSeeded: boolean;
  selectedCalendars: ISelectedCalendar[];
  internal: boolean | undefined;
}
