// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGeoServiceStatus } from './geo-service-status.interface';

export interface IMapTileConfig extends IGeoServiceStatus {
  urlTemplate: string | null;
  subdomains: string[];
  attribution: string;
  maxZoom: number;
}
