// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Scheduled works of a date range together with their clients.
 * @param works - Work entries only (no absences, breaks or other entry types)
 * @param clients - Clients the works belong to
 */

import { IPluginScheduledClient } from './plugin-scheduled-client.interface';
import { IPluginScheduledWork } from './plugin-scheduled-work.interface';

export interface IPluginScheduledWorks {
  works: IPluginScheduledWork[];
  clients: IPluginScheduledClient[];
}
