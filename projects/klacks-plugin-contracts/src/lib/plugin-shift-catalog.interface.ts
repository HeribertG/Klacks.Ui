// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read access of plugins to the shift definitions of the host.
 * @param readShifts - Loads the shifts matching the query
 */

import { Observable } from 'rxjs';
import { IPluginShift } from './plugin-shift.interface';
import { IPluginShiftQuery } from './plugin-shift-query.interface';

export interface IPluginShiftCatalog {
  readShifts(query: IPluginShiftQuery): Observable<IPluginShift[]>;
}
