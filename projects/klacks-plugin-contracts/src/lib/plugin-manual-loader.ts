// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manual/help documentation loader abstraction for plugins.
 * @param loadManual - Loads a help document by name and language
 */

import { Observable } from 'rxjs';

export interface IPluginManualLoader {
  loadManual(manualName: string, lang: string): Observable<string>;
}
