// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zur Erkennung und Verwaltung von Schedule-Validierungen via SignalR.
 * Verarbeitet Kollisionen (error), Ruhezeit/Arbeitszeit-Verletzungen (warning)
 * und Unterbesetzung (info).
 * @param collisions - Map aller empfangenen Kollisionen (Key: sortierte Work-ID-Paare)
 * @param validationEntries - Alle Validierungseinträge vom Backend (warning, info)
 * @param errorEntries - Kombinierte Error-Einträge basierend auf sichtbaren Clients und Datumsbereich
 * @param errorCount - Anzahl der aktuell sichtbaren Error-Einträge (für Tab-Badge)
 */
import { inject, Injectable, signal, computed, OnDestroy, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import {
  ICollisionListNotification,
  ICollisionNotification,
} from 'src/app/domain/interfaces/collision-notification.interface';
import { IScheduleValidationNotification } from 'src/app/domain/interfaces/schedule-validation-notification.interface';
import { IScheduleValidationListNotification } from 'src/app/domain/interfaces/schedule-validation-list-notification.interface';
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
  private validations = new Map<string, IScheduleValidationNotification>();
  private subscriptions: Subscription[] = [];

  private entriesUpdated = signal(0);

  errorEntries = signal<ScheduleErrorEntry[]>([]);

  errorCount = computed(() => this.errorEntries().filter(e => e.type === 'error').length);
  warningCount = computed(() => this.errorEntries().filter(e => e.type === 'warning').length);
  infoCount = computed(() => this.errorEntries().filter(e => e.type === 'info').length);

  constructor() {
    this.subscriptions.push(
      this.signalRService.collisionsDetected$.subscribe((notification) => {
        this.processCollisionNotification(notification);
        this.entriesUpdated.set(this.entriesUpdated() + 1);
      }),
    );

    this.subscriptions.push(
      this.signalRService.scheduleValidationsDetected$.subscribe((notification) => {
        this.processValidationNotification(notification);
        this.entriesUpdated.set(this.entriesUpdated() + 1);
      }),
    );

    effect(() => {
      this.entriesUpdated();
      this.dataManagement.workScheduleChunkLoaded();
      this.refreshEntries();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private refreshEntries(): void {
    const visibleClientIds = new Set(this.dataManagement.clients.map((c) => c.id));
    const startDate = this.dataManagement.visibleStartDate
      ? formatDateOnly(this.dataManagement.visibleStartDate)
      : undefined;
    const endDate = this.dataManagement.visibleEndDate
      ? formatDateOnly(this.dataManagement.visibleEndDate)
      : undefined;

    const entries: ScheduleErrorEntry[] = [];

    for (const collision of this.collisions.values()) {
      if (!visibleClientIds.has(collision.clientId)) continue;
      if (startDate && collision.date < startDate) continue;
      if (endDate && collision.date > endDate) continue;

      entries.push({
        type: 'error',
        date: collision.date,
        clientId: collision.clientId,
        clientName: collision.clientName,
        comment: 'schedule.error-list.collision',
        commentParams: {
          timeRange1: collision.timeRange1,
          timeRange2: collision.timeRange2,
        },
      });
    }

    for (const validation of this.validations.values()) {
      if (!visibleClientIds.has(validation.clientId)) continue;
      if (startDate && validation.date < startDate) continue;
      if (endDate && validation.date > endDate) continue;

      entries.push({
        type: validation.type,
        date: validation.date,
        clientId: validation.clientId,
        clientName: validation.clientName,
        comment: validation.comment,
        commentParams: validation.commentParams,
      });
    }

    this.errorEntries.set(entries);
  }

  private processCollisionNotification(notification: ICollisionListNotification): void {
    if (notification.isFullRefresh) {
      this.collisions.clear();
      for (const collision of notification.collisions) {
        const key = this.buildCollisionKey(collision.workId1, collision.workId2);
        this.collisions.set(key, collision);
      }
      return;
    }

    if (notification.checkedClientId && notification.checkedDate) {
      this.removeCollisionsForClientDate(notification.checkedClientId, notification.checkedDate);
    }

    for (const collision of notification.collisions) {
      const key = this.buildCollisionKey(collision.workId1, collision.workId2);
      this.collisions.set(key, collision);
    }
  }

  private processValidationNotification(notification: IScheduleValidationListNotification): void {
    if (notification.isFullRefresh) {
      this.validations.clear();
      for (const entry of notification.entries) {
        const key = this.buildValidationKey(entry);
        this.validations.set(key, entry);
      }
      return;
    }

    if (notification.checkedClientId && notification.checkedDate) {
      this.removeValidationsForClientDate(notification.checkedClientId, notification.checkedDate);
    }

    for (const entry of notification.entries) {
      const key = this.buildValidationKey(entry);
      this.validations.set(key, entry);
    }
  }

  private removeCollisionsForClientDate(clientId: string, date: string): void {
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

  private removeValidationsForClientDate(clientId: string, date: string): void {
    const keysToRemove: string[] = [];
    for (const [key, validation] of this.validations) {
      if (validation.clientId === clientId && validation.date === date) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.validations.delete(key);
    }
  }

  private buildCollisionKey(workId1: string, workId2: string): string {
    return workId1 < workId2 ? `${workId1}_${workId2}` : `${workId2}_${workId1}`;
  }

  private buildValidationKey(entry: IScheduleValidationNotification): string {
    return `${entry.type}_${entry.clientId}_${entry.date}_${entry.comment}`;
  }
}
