// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Holds the short-lived OAuth2 authorization handshake values (CSRF state and
 * redirect URI) for the duration of the provider round trip.
 *
 * sessionStorage is used instead of localStorage because these values are only
 * valid for the tab that started the flow and must not outlive the browser
 * session. They are read exactly once via consume(), which also removes them,
 * so an aborted or failed callback cannot leave a stale state behind.
 */

import { Injectable } from '@angular/core';

const STATE_KEY = 'oauth2_state';
const REDIRECT_URI_KEY = 'oauth2_redirect_uri';

export interface OAuth2Handshake {
  state: string | null;
  redirectUri: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class OAuth2HandshakeStorageService {
  start(state: string, redirectUri: string): void {
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);
  }

  consume(): OAuth2Handshake {
    const state = sessionStorage.getItem(STATE_KEY);
    const redirectUri = sessionStorage.getItem(REDIRECT_URI_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(REDIRECT_URI_KEY);
    return { state, redirectUri };
  }
}
