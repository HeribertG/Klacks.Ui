// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Connection options every SignalR hub of the Ui shares: the HttpOnly session cookie authenticates negotiate and the
 * WebSocket upgrade (credentials are sent also when the Ui runs on another origin, as in development), and the CSRF
 * marker header X-Requested-With goes on the HTTP requests (negotiate, long polling), which the backend demands of
 * cookie-authenticated writes. No access token factory: no token is readable by scripts.
 */

import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';

export const HUB_SESSION_COOKIE_OPTIONS = {
  withCredentials: true,
  headers: { [X_REQUESTED_WITH_HEADER]: X_REQUESTED_WITH_VALUE },
} as const;
