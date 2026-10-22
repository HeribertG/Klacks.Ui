// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DisplayRange } from './display-range.interface';

export interface ShiftBoxDrawParams {
  ctx: CanvasRenderingContext2D;
  range: DisplayRange;
  boxWidth: number;
  marginLeftRight: number;
  height: number;
}
