export interface IGridRowHeader {
  lastRow: number;
  firstRow: number;
  img: HTMLCanvasElement | undefined;
}

export class GridRowHeader implements IGridRowHeader {
  lastRow: number = 0;
  firstRow: number = 0;
  img = undefined;
}
