// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Registration the server rejected, with the email and password exactly as they were sent, so a field error
 * disappears as soon as the user changes the value it was about.
 */
export interface SetupServerRejection {
  email: string;
  password: string;
  reasons: string[];
}
