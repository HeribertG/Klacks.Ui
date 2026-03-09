// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ScheduleNoteResource } from 'src/app/domain/models/schedule-note/schedule-note';

@Injectable({
  providedIn: 'root',
})
export class DataScheduleNoteService {
  private httpClient = inject(HttpClient);

  create(resource: ScheduleNoteResource): Observable<ScheduleNoteResource> {
    return this.httpClient.post<ScheduleNoteResource>(`${environment.baseUrl}ScheduleNotes`, resource);
  }

  update(resource: ScheduleNoteResource): Observable<ScheduleNoteResource> {
    return this.httpClient.put<ScheduleNoteResource>(`${environment.baseUrl}ScheduleNotes`, resource);
  }

  delete(id: string): Observable<ScheduleNoteResource> {
    return this.httpClient.delete<ScheduleNoteResource>(`${environment.baseUrl}ScheduleNotes/${id}`);
  }

  get(id: string): Observable<ScheduleNoteResource> {
    return this.httpClient.get<ScheduleNoteResource>(`${environment.baseUrl}ScheduleNotes/${id}`).pipe(retry(3));
  }
}
