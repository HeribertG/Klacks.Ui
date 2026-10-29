// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EMPTY_GUID } from '../constants/empty-guid.constants';
import { IRouteLocation } from '../models/container/route-location.interface';
import { buildRouteMapMarkers, hasRouteCoordinates, isBaseRouteLocation } from './route-map-marker.helper';

const step = (name: string, shiftId: string, latitude: number, longitude: number): IRouteLocation => ({
  name,
  address: `${name} street`,
  latitude,
  longitude,
  shiftId,
  distanceToNextKm: 0,
  travelTimeToNext: '00:00:00',
  order: 0,
});

describe('route-map-marker.helper', () => {
  it('treats an all-zero or missing shift id as a base', () => {
    // Arrange
    const zero = step('Base', EMPTY_GUID, 47.5, 8.7);
    const missing = step('Base', '', 47.5, 8.7);
    const visit = step('Visit', 'shift-1', 47.5, 8.7);

    // Act / Assert
    expect(isBaseRouteLocation(zero)).toBe(true);
    expect(isBaseRouteLocation(missing)).toBe(true);
    expect(isBaseRouteLocation(visit)).toBe(false);
  });

  it('numbers the visits 1..n in route order and skips the bases in the numbering', () => {
    // Arrange
    const route = [
      step('Base', EMPTY_GUID, 47.5, 8.7),
      step('Anna', 'shift-a', 47.51, 8.71),
      step('Bruno', 'shift-b', 47.52, 8.72),
      step('Carla', 'shift-c', 47.53, 8.73),
      step('Base', EMPTY_GUID, 47.6, 8.8),
    ];

    // Act
    const markers = buildRouteMapMarkers(route);

    // Assert
    expect(markers.map((m) => [m.kind, m.stopNumber, m.name])).toEqual([
      ['base', null, 'Base'],
      ['stop', 1, 'Anna'],
      ['stop', 2, 'Bruno'],
      ['stop', 3, 'Carla'],
      ['base', null, 'Base'],
    ]);
  });

  it('shows a base that is start and end at the same spot only once', () => {
    // Arrange
    const route = [
      step('Base', EMPTY_GUID, 47.5, 8.7),
      step('Anna', 'shift-a', 47.51, 8.71),
      step('Base', EMPTY_GUID, 47.5, 8.7),
    ];

    // Act
    const markers = buildRouteMapMarkers(route);

    // Assert
    expect(markers.filter((m) => m.kind === 'base')).toHaveLength(1);
    expect(markers).toHaveLength(2);
  });

  it('skips steps without coordinates and keeps the numbering gap-free', () => {
    // Arrange
    const route = [
      step('Anna', 'shift-a', 47.51, 8.71),
      step('Unknown', 'shift-x', 0, 0),
      step('Bruno', 'shift-b', 47.52, 8.72),
    ];

    // Act
    const markers = buildRouteMapMarkers(route);

    // Assert
    expect(hasRouteCoordinates(route[1])).toBe(false);
    expect(markers.map((m) => [m.stopNumber, m.name])).toEqual([
      [1, 'Anna'],
      [2, 'Bruno'],
    ]);
  });
});
