// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface DrawPartContext {
  row: number;
  col: number;
  yStartInCell: number;
  yEndInCell: number;
  firstVisibleRow: number;
  firstVisibleCol: number;
  cellWidth: number;
  cellHeight: number;
  cellHeaderHeight: number;
  sealed: boolean;
}
