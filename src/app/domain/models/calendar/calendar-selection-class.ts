// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISelectedCalendar {
  id: string | undefined;
  calendarSelection: CalendarSelection | undefined;
  country: string;
  state: string;
  officialOverride: boolean | null;
}
export class SelectedCalendar implements ISelectedCalendar {
  id: string | undefined = '';
  calendarSelection: CalendarSelection | undefined = undefined;
  country = '';
  state = '';
  officialOverride: boolean | null = null;
}

export interface ICalendarSelection {
  id: string | undefined;
  name: string;
  isSeeded: boolean;
  selectedCalendars: ISelectedCalendar[];
  internal: boolean | undefined;
}
export class CalendarSelection implements ICalendarSelection {
  id: string | undefined = '';
  name = '';
  isSeeded = false;
  selectedCalendars: ISelectedCalendar[] = [];
  internal: boolean | undefined = undefined;
}
