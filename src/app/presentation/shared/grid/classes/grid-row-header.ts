// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IGridRowHeader {
  lastRow: number;
  firstRow: number;
  img: HTMLCanvasElement | undefined;
}

export class GridRowHeader implements IGridRowHeader {
  lastRow = 0;
  firstRow = 0;
  img = undefined;
}
