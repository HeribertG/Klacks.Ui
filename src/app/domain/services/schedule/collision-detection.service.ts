import { inject, Injectable, signal, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import {
  ICollisionListNotification,
  ICollisionNotification,
} from 'src/app/domain/interfaces/collision-notification.interface';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

@Injectable({
  providedIn: 'root',
})
export class CollisionDetectionService implements OnDestroy {
  private signalRService = inject(SCHEDULE_SIGNALR);
  private collisions = new Map<string, ICollisionNotification>();
  private subscription: Subscription;

  public collisionsUpdated = signal(0);

  get collisionCount(): number {
    return this.collisions.size;
  }

  constructor() {
    this.subscription = this.signalRService.collisionsDetected$.subscribe(
      (notification) => {
        this.processNotification(notification);
        this.collisionsUpdated.set(this.collisionsUpdated() + 1);
      },
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getErrorEntries(): ScheduleErrorEntry[] {
    const entries: ScheduleErrorEntry[] = [];
    for (const collision of this.collisions.values()) {
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
    return entries;
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
