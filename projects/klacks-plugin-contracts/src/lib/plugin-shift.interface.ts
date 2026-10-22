// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Slim shift definition exposed to plugins (structural subset of the host shift).
 */

export interface IPluginShift {
  id: string | undefined;
  name: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  fromDate: Date | undefined;
  untilDate: Date | undefined;
}
