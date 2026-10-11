// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Test double for GeoServicesConfigService: writable signals for every capability plus resolved
 * ensureLoaded/reload spies, so specs can switch single geo services on or off without HTTP.
 * @param overrides - Initial values of the capability signals; everything not given starts as false
 */

import { signal, WritableSignal } from '@angular/core';
import { GeoServicesConfigLoadState } from 'src/app/domain/models/settings/geo-services-config-load-state.model';
import { IMapTileConfig } from 'src/app/domain/models/settings/map-tile-config.interface';

export const TEST_MAP_TILE_CONFIG: IMapTileConfig = {
  enabled: true,
  reason: 'None',
  urlTemplate: 'https://tiles.example.test/{z}/{x}/{y}.png',
  subdomains: [],
  attribution: 'Test tiles',
  maxZoom: 19,
};

export interface GeoServicesConfigMock {
  loadState: WritableSignal<GeoServicesConfigLoadState>;
  geocodingEnabled: WritableSignal<boolean>;
  routingEnabled: WritableSignal<boolean>;
  openRouteServiceEnabled: WritableSignal<boolean>;
  mapTilesEnabled: WritableSignal<boolean>;
  externalMapLinksEnabled: WritableSignal<boolean>;
  mapTiles: WritableSignal<IMapTileConfig | null>;
  ensureLoaded: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
}

export interface GeoServicesConfigMockOverrides {
  loadState?: GeoServicesConfigLoadState;
  geocodingEnabled?: boolean;
  routingEnabled?: boolean;
  openRouteServiceEnabled?: boolean;
  mapTilesEnabled?: boolean;
  externalMapLinksEnabled?: boolean;
  mapTiles?: IMapTileConfig | null;
}

export function createGeoServicesConfigMock(overrides: GeoServicesConfigMockOverrides = {}): GeoServicesConfigMock {
  return {
    loadState: signal(overrides.loadState ?? 'loaded'),
    geocodingEnabled: signal(overrides.geocodingEnabled ?? false),
    routingEnabled: signal(overrides.routingEnabled ?? false),
    openRouteServiceEnabled: signal(overrides.openRouteServiceEnabled ?? false),
    mapTilesEnabled: signal(overrides.mapTilesEnabled ?? false),
    externalMapLinksEnabled: signal(overrides.externalMapLinksEnabled ?? false),
    mapTiles: signal(overrides.mapTiles ?? null),
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  };
}
