// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read access of plugins to the work schedule of the host.
 * @param readScheduledWorks - Loads the scheduled works matching the query
 */

import { Observable } from 'rxjs';
import { IPluginScheduledWorks } from './plugin-scheduled-works.interface';
import { IPluginWorkScheduleQuery } from './plugin-work-schedule-query.interface';

export interface IPluginWorkScheduleReader {
  readScheduledWorks(query: IPluginWorkScheduleQuery): Observable<IPluginScheduledWorks>;
}
