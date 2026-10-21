// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PieChartSlice } from './pie-chart-slice.interface';

export interface PieChartGeometry {
  total: number;
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
  slices: PieChartSlice[];
}
