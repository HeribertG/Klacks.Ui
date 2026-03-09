// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DataScheduleNoteService } from 'src/app/infrastructure/api/schedule-note/data-schedule-note.service';
import { ScheduleNoteResource } from 'src/app/domain/models/schedule-note/schedule-note';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleNoteService {
  private dataScheduleNoteService = inject(DataScheduleNoteService);

  public isCreating = signal(false);
  public lastCreated = signal<ScheduleNoteResource | undefined>(undefined);

  create(resource: ScheduleNoteResource): Observable<ScheduleNoteResource> {
    this.isCreating.set(true);
    return new Observable(observer => {
      this.dataScheduleNoteService.create(resource).subscribe({
        next: (result) => {
          this.lastCreated.set(result);
          this.isCreating.set(false);
          observer.next(result);
          observer.complete();
        },
        error: (err) => {
          this.isCreating.set(false);
          observer.error(err);
        }
      });
    });
  }

  get(id: string): Observable<ScheduleNoteResource> {
    return this.dataScheduleNoteService.get(id);
  }

  update(resource: ScheduleNoteResource): Observable<ScheduleNoteResource> {
    return new Observable(observer => {
      this.dataScheduleNoteService.update(resource).subscribe({
        next: (result) => {
          observer.next(result);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  delete(id: string): Observable<ScheduleNoteResource> {
    return this.dataScheduleNoteService.delete(id);
  }
}
