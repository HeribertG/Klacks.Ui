// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Turns the optimized route of a container template (start base, visits, end base) into the markers of a tour
 * map, where visits are numbered 1..n in route order and a base that
 * appears twice at the same spot (start = end) gets a single marker. Steps without coordinates are skipped, as in
 * the route PDF.
 * @param route - Optimized route steps in driving order; bases carry an empty or all-zero shift id
 */
import { EMPTY_GUID } from '../constants/empty-guid.constants';
import { IRouteLocation } from '../models/container/route-location.interface';
import { IRouteMapMarker } from '../models/container/route-map-marker.interface';

export function isBaseRouteLocation(location: IRouteLocation): boolean {
  return !location.shiftId || location.shiftId === EMPTY_GUID;
}

export function hasRouteCoordinates(location: IRouteLocation): boolean {
  return !!location.latitude && !!location.longitude;
}

export function buildRouteMapMarkers(route: readonly IRouteLocation[]): IRouteMapMarker[] {
  const markers: IRouteMapMarker[] = [];
  const baseSpots = new Set<string>();
  let stopNumber = 0;

  for (const location of route.filter(hasRouteCoordinates)) {
    if (isBaseRouteLocation(location)) {
      const spot = `${location.latitude},${location.longitude}`;
      if (baseSpots.has(spot)) {
        continue;
      }
      baseSpots.add(spot);
      markers.push(toMarker(location, null));
      continue;
    }

    stopNumber++;
    markers.push(toMarker(location, stopNumber));
  }

  return markers;
}

function toMarker(location: IRouteLocation, stopNumber: number | null): IRouteMapMarker {
  return {
    kind: stopNumber === null ? 'base' : 'stop',
    stopNumber,
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
    address: location.address,
  };
}
