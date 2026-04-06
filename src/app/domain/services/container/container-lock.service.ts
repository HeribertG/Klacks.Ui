// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for managing container edit locks with auto-heartbeat.
 * Acquires a lock for a resource, refreshes it on a fixed interval, and releases on stop.
 * @param resourceType - "ContainerTemplate" or "ContainerWork"
 * @param resourceId - The id of the container resource to lock
 */
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, interval, switchMap, takeUntil, catchError, of, tap } from 'rxjs';
import { DataContainerLockService } from 'src/app/infrastructure/api/container/data-container-lock.service';
import { IContainerLock } from 'src/app/domain/models/container/container-lock';

const HEARTBEAT_INTERVAL_MS = 30000;

@Injectable({ providedIn: 'root' })
export class ContainerLockService {
  private dataService = inject(DataContainerLockService);

  private currentLockId: string | null = null;
  private stopHeartbeat$ = new Subject<void>();
  readonly currentLock = signal<IContainerLock | null>(null);

  acquire(resourceType: string, resourceId: string): Observable<IContainerLock> {
    this.stopCurrent();
    return this.dataService.acquire(resourceType, resourceId).pipe(
      tap(lock => {
        this.currentLock.set(lock);
        if (lock.acquired) {
          this.currentLockId = lock.id;
          this.startHeartbeat();
        }
      }),
    );
  }

  release(): void {
    if (!this.currentLockId) {
      this.stopCurrent();
      return;
    }
    const lockId = this.currentLockId;
    this.stopCurrent();
    this.dataService.release(lockId).pipe(catchError(() => of(false))).subscribe();
  }

  private startHeartbeat(): void {
    interval(HEARTBEAT_INTERVAL_MS)
      .pipe(
        takeUntil(this.stopHeartbeat$),
        switchMap(() =>
          this.currentLockId
            ? this.dataService.heartbeat(this.currentLockId).pipe(catchError(() => of(null)))
            : of(null),
        ),
      )
      .subscribe(lock => {
        if (lock && !lock.acquired) {
          this.stopCurrent();
        }
      });
  }

  private stopCurrent(): void {
    this.stopHeartbeat$.next();
    this.currentLockId = null;
    this.currentLock.set(null);
  }
}
