// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zur Erkennung und Verwaltung von Schicht-Kollisionen via SignalR.
 * @param collisions - Map aller empfangenen Kollisionen (Key: sortierte Work-ID-Paare)
 * @param errorEntries - Gefilterte Error-Einträge basierend auf sichtbaren Clients und Datumsbereich
 * @param errorCount - Anzahl der aktuell sichtbaren Error-Einträge (für Tab-Badge)
 */
import { inject, Injectable, signal, computed, OnDestroy, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import {
  ICollisionListNotification,
  ICollisionNotification,
} from 'src/app/domain/interfaces/collision-notification.interface';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root',
})
export class CollisionDetectionService implements OnDestroy {
  private signalRService = inject(SCHEDULE_SIGNALR);
  private dataManagement = inject(DataManagementScheduleService);
  private collisions = new Map<string, ICollisionNotification>();
  private subscription: Subscription;

  private collisionsUpdated = signal(0);

  errorEntries = signal<ScheduleErrorEntry[]>([]);

  errorCount = computed(() => this.errorEntries().length);

  constructor() {
    this.subscription = this.signalRService.collisionsDetected$.subscribe(
      (notification) => {
        this.processNotification(notification);
        this.collisionsUpdated.set(this.collisionsUpdated() + 1);
      },
    );

    effect(() => {
      this.collisionsUpdated();
      this.dataManagement.workScheduleChunkLoaded();
      this.refreshEntries();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private refreshEntries(): void {
    const visibleClientIds = new Set(this.dataManagement.clients.map(c => c.id));
    const startDate = this.dataManagement.visibleStartDate ? formatDateOnly(this.dataManagement.visibleStartDate) : undefined;
    const endDate = this.dataManagement.visibleEndDate ? formatDateOnly(this.dataManagement.visibleEndDate) : undefined;

    const entries: ScheduleErrorEntry[] = [];
    for (const collision of this.collisions.values()) {
      if (!visibleClientIds.has(collision.clientId)) {
        continue;
      }
      if (startDate && collision.date < startDate) {
        continue;
      }
      if (endDate && collision.date > endDate) {
        continue;
      }
      entries.push({
        type: 'error',
        date: collision.date,
        clientName: collision.clientName,
        comment: 'schedule.error-list.collision',
        commentParams: {
          timeRange1: collision.timeRange1,
          timeRange2: collision.timeRange2,
        },
      });
    }
    this.errorEntries.set(entries);
  }

  private processNotification(notification: ICollisionListNotification): void {
    if (notification.isFullRefresh) {
      this.collisions.clear();
      for (const collision of notification.collisions) {
        const key = this.buildKey(collision.workId1, collision.workId2);
        this.collisions.set(key, collision);
      }
      return;
    }

    if (notification.checkedClientId && notification.checkedDate) {
      this.removeCollisionsForClientDate(
        notification.checkedClientId,
        notification.checkedDate,
      );
    }

    for (const collision of notification.collisions) {
      const key = this.buildKey(collision.workId1, collision.workId2);
      this.collisions.set(key, collision);
    }
  }

  private removeCollisionsForClientDate(
    clientId: string,
    date: string,
  ): void {
    const keysToRemove: string[] = [];
    for (const [key, collision] of this.collisions) {
      if (collision.clientId === clientId && collision.date === date) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.collisions.delete(key);
    }
  }

  private buildKey(workId1: string, workId2: string): string {
    return workId1 < workId2
      ? `${workId1}_${workId2}`
      : `${workId2}_${workId1}`;
  }
}
