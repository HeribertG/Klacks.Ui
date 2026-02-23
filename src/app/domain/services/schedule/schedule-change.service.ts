// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { computed, inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataScheduleChangeService } from 'src/app/infrastructure/api/schedule/data-schedule-change.service';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';

@Injectable({
  providedIn: 'root',
})
export class ScheduleChangeService {
  private dataScheduleChange = inject(DataScheduleChangeService);
  private signalRService = inject(SCHEDULE_SIGNALR);
  private destroyRef = inject(DestroyRef);

  private dirtyClientIds = new Set<string>();

  public dirtyStateUpdated = signal<number>(0);

  hasDirtyClients = computed(() => {
    this.dirtyStateUpdated();
    return this.dirtyClientIds.size > 0;
  });

  constructor() {
    this.signalRService.scheduleChangeTracked$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        this.markDirty(notification.clientId);
      });
  }

  loadDirtyClients(startDate: string, endDate: string): void {
    this.dataScheduleChange
      .getChanges(startDate, endDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (changes) => {
          this.dirtyClientIds.clear();
          for (const change of changes) {
            this.dirtyClientIds.add(change.clientId);
          }
          this.dirtyStateUpdated.set(Date.now());
        },
        error: (err) => {
          console.error('Error loading schedule changes:', err);
        },
      });
  }

  markDirty(clientId: string): void {
    this.dirtyClientIds.add(clientId);
    this.dirtyStateUpdated.set(Date.now());
  }

  isDirty(clientId: string): boolean {
    return this.dirtyClientIds.has(clientId);
  }

  clear(): void {
    this.dirtyClientIds.clear();
    this.dirtyStateUpdated.set(Date.now());
  }
}
