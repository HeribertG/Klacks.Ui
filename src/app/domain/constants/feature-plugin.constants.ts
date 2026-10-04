// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for feature plugin names used across the application, plus the right the host demands
 * before it offers a plugin's page at all.
 */
import { ROLE_AUTHORISED } from './permissions.constants';

export const MESSAGING_PLUGIN_NAME = 'messaging';
export const FLOOR_PLAN_PLUGIN_NAME = 'floor-plan';

/**
 * The messaging plugin answers its message, send and broadcast routes only for Admin and Authorised, so
 * its page is offered to exactly those roles; a planner would only meet 403s there.
 */
export const MESSAGING_PLUGIN_REQUIRED_PERMISSION = ROLE_AUTHORISED;

/**
 * Right the route guard, the sidebar and Klacksy demand for a feature plugin's page. A plugin missing
 * here needs nothing beyond a session.
 */
export const FEATURE_PLUGIN_REQUIRED_PERMISSIONS: Readonly<Record<string, string>> = {
  [MESSAGING_PLUGIN_NAME]: MESSAGING_PLUGIN_REQUIRED_PERMISSION,
};
