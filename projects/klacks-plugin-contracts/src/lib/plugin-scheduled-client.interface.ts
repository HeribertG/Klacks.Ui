// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Client of a scheduled work, reduced to what plugins display.
 */

export interface IPluginScheduledClient {
  id: string;
  firstName: string | null;
  name: string | null;
}
