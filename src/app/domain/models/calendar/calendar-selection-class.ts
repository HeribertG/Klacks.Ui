// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ISelectedCalendar {
  id: string | undefined;
  calendarSelection: CalendarSelection | undefined;
  country: string;
  state: string;
}
export class SelectedCalendar implements ISelectedCalendar {
  id: string | undefined = '';
  calendarSelection: CalendarSelection | undefined = undefined;
  country = '';
  state = '';
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
