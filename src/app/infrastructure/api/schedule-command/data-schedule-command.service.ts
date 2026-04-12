// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP service for CRUD operations on schedule commands.
 * @param http - Angular HttpClient for API calls
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ScheduleCommandResource } from '../../../domain/models/schedule-command/schedule-command';

@Injectable({ providedIn: 'root' })
export class DataScheduleCommandService {
  private readonly http = inject(HttpClient);

  create(resource: ScheduleCommandResource): Observable<ScheduleCommandResource> {
    return this.http.post<ScheduleCommandResource>(`${environment.baseUrl}ScheduleCommands`, resource);
  }

  update(resource: ScheduleCommandResource): Observable<ScheduleCommandResource> {
    return this.http.put<ScheduleCommandResource>(`${environment.baseUrl}ScheduleCommands`, resource);
  }

  delete(id: string): Observable<ScheduleCommandResource> {
    return this.http.delete<ScheduleCommandResource>(`${environment.baseUrl}ScheduleCommands/${id}`);
  }

  get(id: string): Observable<ScheduleCommandResource> {
    return this.http.get<ScheduleCommandResource>(`${environment.baseUrl}ScheduleCommands/${id}`).pipe(retry(3));
  }
}
