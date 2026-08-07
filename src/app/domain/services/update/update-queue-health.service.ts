// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Detects queued update operations that no updater has picked up. Operations are handed over through
 * the update history table and claimed by the out-of-process updater within one of its poll intervals,
 * so a row still unclaimed several intervals later is not an installation in progress - it means no
 * updater is running and the request will sit there forever.
 * @param operation - Queued operation carrying its status and the enqueue/claim timestamps
 */
import { Injectable } from '@angular/core';

const PENDING_STATUS = 'Pending';
const UPDATER_CLAIM_GRACE_MS = 120000;
const MS_PER_MINUTE = 60000;

export interface IQueuedOperation {
  status: string;
  requestedAt: string;
  startedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UpdateQueueHealthService {
  public isAwaitingUpdater(operation: IQueuedOperation | null | undefined): boolean {
    if (!operation || operation.status !== PENDING_STATUS || !!operation.startedAt) {
      return false;
    }

    return this.waitingMs(operation.requestedAt) > UPDATER_CLAIM_GRACE_MS;
  }

  public waitingMinutes(operation: IQueuedOperation | null | undefined): number {
    if (!operation) {
      return 0;
    }

    return Math.floor(this.waitingMs(operation.requestedAt) / MS_PER_MINUTE);
  }

  private waitingMs(requestedAt: string): number {
    const requested = Date.parse(requestedAt);
    if (Number.isNaN(requested)) {
      return 0;
    }

    return Date.now() - requested;
  }
}
