// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Whether a message is tied to a Klacks client or is internal (owner bridge, future user DMs).
 */
export enum MessageScope {
  Client = 0,
  Internal = 1,
}
