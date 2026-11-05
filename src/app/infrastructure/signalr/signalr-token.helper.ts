// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Session helper for the SignalR hubs. The hubs authenticate negotiate and the WebSocket upgrade with the HttpOnly
 * session cookie, so there is no token to hand over: the helper only tells whether this tab holds a local session,
 * whether the stored access-token expiry has passed, and renews the session through the shared single-flight refresh.
 * @param sessionStore - Local session marker and access-token expiry hint
 * @param dataAuthService - Performs the cookie-based refresh through the shared single-flight endpoint
 */
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';
import { SessionStore } from '../storage/session-store.service';
import { DataAuthService } from '../api/data-auth.service';

export class SignalRTokenHelper {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly dataAuthService: DataAuthService,
  ) {}

  hasSession(): boolean {
    return this.sessionStore.hasSession();
  }

  isAccessExpired(): boolean {
    return this.sessionStore.isAccessExpired();
  }

  async attemptTokenRefresh(): Promise<SessionRenewalOutcome> {
    const outcome = await this.dataAuthService.renewSession();
    if (outcome !== SessionRenewalOutcome.Renewed) {
      console.warn('[SignalR] session renewal ' + outcome);
    }
    return outcome;
  }
}
