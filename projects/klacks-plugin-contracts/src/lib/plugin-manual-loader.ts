// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Manual/help documentation loader abstraction for plugins.
 * @param loadManual - Loads a help document by name and language
 */

import { Observable } from 'rxjs';

export interface IPluginManualLoader {
  loadManual(manualName: string, lang: string): Observable<string>;
}
