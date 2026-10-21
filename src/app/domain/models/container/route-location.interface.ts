// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IRouteLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  shiftId: string;
  distanceToNextKm: number;
  travelTimeToNext: string;
  order: number;
}
