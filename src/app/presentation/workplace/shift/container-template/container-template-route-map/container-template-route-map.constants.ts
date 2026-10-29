// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Drawing constants of the container tour map: line styles for the road geometry and the straight-line fallback,
 * marker icon classes and sizes, fit-to-bounds padding and zoom cap, and the i18n keys the map shows.
 */
import type { PolylineOptions, PointTuple } from 'leaflet';

export const ROUTE_MAP_ROAD_LINE_STYLE: PolylineOptions = {
  color: '#3388FF',
  weight: 5,
  opacity: 0.85,
};

export const ROUTE_MAP_ESTIMATED_LINE_STYLE: PolylineOptions = {
  color: '#3388FF',
  weight: 3,
  opacity: 0.85,
  dashArray: '8 8',
};

export const ROUTE_MAP_STOP_MARKER_CLASS = 'route-map-stop-marker';
export const ROUTE_MAP_BASE_MARKER_CLASS = 'route-map-base-marker';
export const ROUTE_MAP_TOOLTIP_LINE_CLASS = 'route-map-tooltip-line';
export const ROUTE_MAP_MARKER_SIZE: PointTuple = [26, 26];
export const ROUTE_MAP_MARKER_ANCHOR: PointTuple = [13, 13];
export const ROUTE_MAP_FIT_PADDING: PointTuple = [24, 24];
export const ROUTE_MAP_FIT_MAX_ZOOM = 16;

export const ROUTE_MAP_BASE_LABEL_KEY = 'shift.container-template.route-map.base';
export const ROUTE_MAP_ESTIMATED_HINT_KEY = 'shift.container-template.route-map.estimated';
