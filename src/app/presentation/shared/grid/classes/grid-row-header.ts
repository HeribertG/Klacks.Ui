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
