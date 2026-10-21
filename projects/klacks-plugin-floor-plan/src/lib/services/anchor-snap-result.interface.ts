// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AnchorPoint } from './anchor-point.interface';

export interface AnchorSnapResult {
  offsetX: number;
  offsetY: number;
  targetPoint: AnchorPoint;
}
