// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the forced own-admin setup flow that runs on a freshly deployed instance
 * before the seeded admin account is allowed to do anything else in the app.
 * @param SETUP_STATUS_API_SEGMENT - API path of the setup status (gate state and password policy)
 * @param SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT - API path that registers the own admin account
 * @param FIRST_START_ROUTE_PATH - Page of the own-admin setup reached without signing in on a fresh installation
 * @param COMPANY_SETUP_ROUTE_PATH - Page shown right after the own admin was created: installed country and industry
 * @param SETUP_FIRST_START_STATUS_API_SEGMENT - Anonymous API path that tells whether the installation can still be claimed
 * @param SETUP_COMPLETE_FIRST_START_API_SEGMENT - Anonymous API path that registers the own admin on the first start
 * @param ROUTE_DATA_FIRST_START - Route data flag that puts the setup page into its anonymous first-start mode
 */
export const SETUP_ROUTE_PATH = 'setup';

export const FIRST_START_ROUTE_PATH = 'first-start';

export const COMPANY_SETUP_ROUTE_PATH = 'company-setup';

export const ROUTE_DATA_FIRST_START = 'firstStart';

export const SEED_ADMIN_USER_ID = '672f77e8-e479-4422-8781-84d218377fb3';

export const SETUP_STATUS_API_SEGMENT = 'Setup/Status';

export const SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT = 'Setup/CompleteOwnAdmin';

export const SETUP_FIRST_START_STATUS_API_SEGMENT = 'Setup/FirstStartStatus';

export const SETUP_COMPLETE_FIRST_START_API_SEGMENT = 'Setup/CompleteFirstStart';
