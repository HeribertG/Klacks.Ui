// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AxisConfig } from './axis-config.interface';

export interface ScrollbarViewport {
  canvas(): HTMLCanvasElement;
  axis(): AxisConfig;
  isHorizontal(): boolean;
  isHorizontalRtl(): boolean;
  value(): number;
  maxValue(): number;
  visibleValue(): number;
}
