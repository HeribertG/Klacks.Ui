// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the URL of an external map website for one coordinate.
 * @param template - One of the link templates in external-map-link.constants.ts
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 */

import {
  EXTERNAL_MAP_LINK_LATITUDE_PLACEHOLDER,
  EXTERNAL_MAP_LINK_LONGITUDE_PLACEHOLDER,
} from 'src/app/domain/constants/external-map-link.constants';

export function buildExternalMapLink(template: string, latitude: number, longitude: number): string {
  return template
    .split(EXTERNAL_MAP_LINK_LATITUDE_PLACEHOLDER)
    .join(String(latitude))
    .split(EXTERNAL_MAP_LINK_LONGITUDE_PLACEHOLDER)
    .join(String(longitude));
}
