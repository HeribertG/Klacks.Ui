export interface ISelectedCalendar {
  id: string | undefined;
  calendarSelection: CalendarSelection | undefined;
  country: string;
  state: string;
}
export class SelectedCalendar implements ISelectedCalendar {
  id: string | undefined = '';
  calendarSelection: CalendarSelection | undefined = undefined;
  country: string = '';
  state: string = '';
}

export interface ICalendarSelection {
  id: string | undefined;
  name: string;
  selectedCalendars: ISelectedCalendar[];
  internal: boolean | undefined;
}
export class CalendarSelection implements ICalendarSelection {
  id: string | undefined = '';
  name: string = '';
  selectedCalendars: ISelectedCalendar[] = [];
  internal: boolean | undefined = undefined;
}
