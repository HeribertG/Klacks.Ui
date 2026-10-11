// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wire model of the read-only GeoServicesConfig endpoint: which geo services this installation may use
 * and, for map tiles, where the browser loads them from. Internal base URLs of geocoding and routing are
 * deliberately not part of the contract.
 */

import { IGeoServiceStatus } from './geo-service-status.interface';
import { IMapTileConfig } from './map-tile-config.interface';

export interface IGeoServicesConfig {
  noOutboundTraffic: boolean;
  geocoding: IGeoServiceStatus;
  routing: IGeoServiceStatus;
  openRouteService: IGeoServiceStatus;
  mapTiles: IMapTileConfig;
  externalMapLinksEnabled: boolean;
}
