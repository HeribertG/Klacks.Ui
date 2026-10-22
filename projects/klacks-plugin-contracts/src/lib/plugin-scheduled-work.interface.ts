// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One scheduled work exposed to plugins.
 */

export interface IPluginScheduledWork {
  clientId: string;
  startTime: string;
  endTime: string;
}
