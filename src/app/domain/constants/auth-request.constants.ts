// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the credentialed account requests that carry the HttpOnly refresh-token cookie: the CSRF marker
 * header the backend requires on them and how long the SSO sign-out waits for the server logout.
 */

export const X_REQUESTED_WITH_HEADER = 'X-Requested-With';

export const X_REQUESTED_WITH_VALUE = 'XMLHttpRequest';

export const SERVER_LOGOUT_WAIT_MS = 2000;
