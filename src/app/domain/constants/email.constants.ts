// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ROLE_AUTHORISED } from './permissions.constants';

export const SPECIAL_USE_INBOX = 'Inbox';
export const SPECIAL_USE_TRASH = 'Trash';
export const SPECIAL_USE_JUNK = 'Junk';
export const SPECIAL_USE_SENT = 'Sent';
export const CLIENT_ASSIGNED_FOLDER = 'client-assigned';
export const SPECIAL_USE_CLIENT_ASSIGNED = 'client-assigned';

/**
 * The received-email endpoints answer only Admin and Authorised, so the inbox page, its unread badge and
 * Klacksy's inbox navigation demand the same role.
 */
export const INBOX_REQUIRED_PERMISSION = ROLE_AUTHORISED;
