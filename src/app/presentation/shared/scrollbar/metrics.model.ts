// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMetrics } from './metrics.interface';

export class Metrics implements IMetrics {
  visibleTicks = 0;
  tickSize = 0;
  thumbLength = 0;
}
