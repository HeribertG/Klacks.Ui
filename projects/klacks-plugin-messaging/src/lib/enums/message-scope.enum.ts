// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Whether a message is tied to a Klacks client or is internal (owner bridge, future user DMs).
 */
export enum MessageScope {
  Client = 0,
  Internal = 1,
}
