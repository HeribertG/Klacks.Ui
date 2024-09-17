import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import {
  CalendarSelection,
  ICalendarSelection,
  ISelectedCalendar,
  SelectedCalendar,
} from '../core/calendar-selection-class';
import { retry } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataCalendarSelectionService {
  constructor(private httpClient: HttpClient) {}

  getSelectedCalendar(id: string) {
    return this.httpClient
      .get<ISelectedCalendar>(`${environment.baseUrl}SelectedCalendars/` + id)
      .pipe(retry(3));
  }

  addSelectedCalendar(value: SelectedCalendar) {
    return this.httpClient
      .post<ISelectedCalendar>(
        `${environment.baseUrl}SelectedCalendars/`,
        value
      )
      .pipe();
  }

  updateSelectedCalendar(value: SelectedCalendar) {
    return this.httpClient
      .put<ISelectedCalendar>(`${environment.baseUrl}SelectedCalendars/`, value)
      .pipe();
  }

  deleteSelectedCalendar(id: string) {
    return this.httpClient
      .delete<ISelectedCalendar>(
        `${environment.baseUrl}SelectedCalendars/` + id
      )
      .pipe(retry(3));
  }

  getList() {
    return this.httpClient
      .get<ICalendarSelection[]>(`${environment.baseUrl}CalendarSelections/`)
      .pipe(retry(3));
  }

  getCalendarSelection(id: string) {
    return this.httpClient
      .get<ICalendarSelection>(`${environment.baseUrl}CalendarSelections/` + id)
      .pipe(retry(3));
  }

  addCalendarSelection(value: CalendarSelection) {
    delete value.internal;
    return this.httpClient
      .post<ICalendarSelection>(
        `${environment.baseUrl}CalendarSelections/`,
        value
      )
      .pipe();
  }

  updateCalendarSelection(value: CalendarSelection) {
    delete value.internal;
    return this.httpClient
      .put<ICalendarSelection>(
        `${environment.baseUrl}CalendarSelections/`,
        value
      )
      .pipe();
  }

  deleteCalendarSelection(id: string) {
    return this.httpClient
      .delete<ICalendarSelection>(
        `${environment.baseUrl}CalendarSelections/` + id
      )
      .pipe(retry(3));
  }
}
