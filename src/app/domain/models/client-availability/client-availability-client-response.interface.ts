// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Response of the client availability client list from the backend.
 * @param clients - List of filtered clients
 * @param totalCount - Total count (before paging)
 */

import { IClientAvailabilityClientResource } from './client-availability-client-resource.interface';
export interface IClientAvailabilityClientResponse {
  clients: IClientAvailabilityClientResource[];
  totalCount: number;
}
