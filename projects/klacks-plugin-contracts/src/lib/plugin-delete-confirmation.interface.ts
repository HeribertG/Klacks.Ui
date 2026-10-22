// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Host delete confirmation dialog for plugins.
 * @param requestDelete - Opens the host delete dialog for the given subject; context identifies the caller
 * @param confirmedDeletes - Emits the subject id each time the user confirms a delete requested with this context
 */

import { Observable } from 'rxjs';

export interface IPluginDeleteConfirmation {
  requestDelete(context: string, subjectId: string): void;
  confirmedDeletes(context: string): Observable<string>;
}
