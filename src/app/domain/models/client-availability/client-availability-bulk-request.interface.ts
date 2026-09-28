// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClientAvailability } from './client-availability.interface';

export interface IClientAvailabilityBulkRequest {
  items: IClientAvailability[];
}
