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
  selectedCalendars: ISelectedCalendar[];
  internal: boolean | undefined;
}
export class CalendarSelection implements ICalendarSelection {
  id: string | undefined = '';
  name = '';
  selectedCalendars: ISelectedCalendar[] = [];
  internal: boolean | undefined = undefined;
}
