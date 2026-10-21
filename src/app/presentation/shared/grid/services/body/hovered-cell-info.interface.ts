// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface HoveredCellInfo {
  row: number;
  column: number;
  isEmpty: boolean;
  isHeader: boolean;
  clientX: number;
  clientY: number;
  blockTooltip?: string;
}
