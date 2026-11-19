// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Error codes the Api sends with a refused sign-in (coded 401 problem), mirrored from the backend exceptions.
 */

/** Directory credentials were correct, but the administrator has not approved this account for sign-in. */
export const AUTH_ERROR_DIRECTORY_ACCESS_NOT_GRANTED = 'directoryAccessNotGranted';
