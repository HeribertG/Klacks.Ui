// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the forced own-admin setup flow that runs on a freshly deployed instance
 * before the seeded admin account is allowed to do anything else in the app.
 * @param SETUP_STATUS_API_SEGMENT - API path of the setup status (gate state and password policy)
 * @param SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT - API path that registers the own admin account
 */
export const SETUP_ROUTE_PATH = 'setup';

export const SEED_ADMIN_USER_ID = '672f77e8-e479-4422-8781-84d218377fb3';

export const SETUP_STATUS_API_SEGMENT = 'Setup/Status';

export const SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT = 'Setup/CompleteOwnAdmin';
