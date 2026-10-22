// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { LocationData } from './location-data.interface';

export interface DashboardLocations {
  locations: LocationData[];
  mapLocations: LocationData[];
  totalClients: number;
}
