// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Carries the reason a route guard refused a navigation from the guard to whoever awaited that
 * navigation. A guard writes the reason synchronously before it returns false, so the value is
 * already there when router.navigateByUrl resolves false in the caller - no dependency on when the
 * /no-access redirect finishes. consume() reads once and clears, because a reason that outlives its
 * navigation would be attributed to the next one.
 */
import { Injectable, signal } from '@angular/core';
import { NoAccessReason } from 'src/app/domain/constants/no-access-reason.constants';

@Injectable({ providedIn: 'root' })
export class NoAccessReasonService {
  private readonly reason = signal<NoAccessReason | null>(null);

  /**
   * Records why the current navigation is being refused.
   * @param reason - permission when a role is missing, feature when the feature is not activated
   */
  set(reason: NoAccessReason): void {
    this.reason.set(reason);
  }

  /** Returns the pending reason and clears it, so it can never be read twice. */
  consume(): NoAccessReason | null {
    const pending = this.reason();
    this.reason.set(null);
    return pending;
  }
}
