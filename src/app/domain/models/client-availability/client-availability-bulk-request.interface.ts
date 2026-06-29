// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IClientAvailability } from './client-availability.interface';

export interface IClientAvailabilityBulkRequest {
  items: IClientAvailability[];
}
