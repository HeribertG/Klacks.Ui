// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read access of plugins to the contact details of a single client.
 * @param readClientDetails - Loads the details of the client with the given id
 */

import { Observable } from 'rxjs';
import { IPluginClientDetails } from './plugin-client-details.interface';

export interface IPluginClientDetailsReader {
  readClientDetails(clientId: string): Observable<IPluginClientDetails>;
}
