// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for managing schedule command CRUD operations and state.
 * @param dataService - Infrastructure API service for HTTP calls
 */
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap, catchError, EMPTY } from 'rxjs';
import { DataScheduleCommandService } from '../../../infrastructure/api/schedule-command/data-schedule-command.service';
import { ScheduleCommandResource } from '../../models/schedule-command/schedule-command';

@Injectable({ providedIn: 'root' })
export class DataManagementScheduleCommandService {
  private readonly dataService = inject(DataScheduleCommandService);

  isCreating = signal(false);
  lastCreated = signal<ScheduleCommandResource | undefined>(undefined);

  create(resource: ScheduleCommandResource): Observable<ScheduleCommandResource> {
    this.isCreating.set(true);
    return this.dataService.create(resource).pipe(
      tap((result) => {
        this.lastCreated.set(result);
        this.isCreating.set(false);
      }),
      catchError((error) => {
        this.isCreating.set(false);
        console.error('Failed to create schedule command', error);
        return EMPTY;
      }),
    );
  }

  get(id: string): Observable<ScheduleCommandResource> {
    return this.dataService.get(id);
  }

  update(resource: ScheduleCommandResource): Observable<ScheduleCommandResource> {
    return this.dataService.update(resource).pipe(
      catchError((error) => {
        console.error('Failed to update schedule command', error);
        return EMPTY;
      }),
    );
  }

  delete(id: string): Observable<ScheduleCommandResource> {
    return this.dataService.delete(id);
  }
}
