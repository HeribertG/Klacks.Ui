// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Resolves a Leaflet-style tile URL template ({s}, {z}, {x}, {y}, {r}) for one tile, so the canvas
 * renderer of the route PDF loads exactly the tile source the installation configured.
 * @param urlTemplate - Tile URL template from the geo services configuration
 * @param subdomains - Configured subdomains; Leaflet's default set is used when the list is empty
 * @param zoom - Tile zoom level
 * @param tileX - Tile column
 * @param tileY - Tile row
 */

const SUBDOMAIN_PLACEHOLDER = '{s}';
const ZOOM_PLACEHOLDER = '{z}';
const TILE_X_PLACEHOLDER = '{x}';
const TILE_Y_PLACEHOLDER = '{y}';
const RETINA_PLACEHOLDER = '{r}';
const LEAFLET_DEFAULT_SUBDOMAINS: readonly string[] = ['a', 'b', 'c'];

export function resolveMapTileSubdomains(subdomains: readonly string[]): readonly string[] {
  return subdomains.length > 0 ? subdomains : LEAFLET_DEFAULT_SUBDOMAINS;
}

export function buildMapTileUrl(
  urlTemplate: string,
  subdomains: readonly string[],
  zoom: number,
  tileX: number,
  tileY: number,
): string {
  const available = resolveMapTileSubdomains(subdomains);
  const subdomain = available[Math.abs(tileX + tileY) % available.length];
  return urlTemplate
    .split(SUBDOMAIN_PLACEHOLDER).join(subdomain)
    .split(ZOOM_PLACEHOLDER).join(String(zoom))
    .split(TILE_X_PLACEHOLDER).join(String(tileX))
    .split(TILE_Y_PLACEHOLDER).join(String(tileY))
    .split(RETINA_PLACEHOLDER).join('');
}
