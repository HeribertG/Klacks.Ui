// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the credentialed account requests that carry the HttpOnly refresh-token cookie: the CSRF marker
 * header the backend requires on them, the path of the server logout and how long a sign-out or sign-in waits for it.
 */

export const X_REQUESTED_WITH_HEADER = 'X-Requested-With';

export const X_REQUESTED_WITH_VALUE = 'XMLHttpRequest';

export const SERVER_LOGOUT_WAIT_MS = 2000;

export const ACCOUNT_LOGOUT_PATH = 'Accounts/Logout';
