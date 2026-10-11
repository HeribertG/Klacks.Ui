// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { GeoServiceDisabledReason } from './geo-service-disabled-reason.model';

export interface IGeoServiceStatus {
  enabled: boolean;
  reason: GeoServiceDisabledReason;
}
