// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TouchPanAccumulator } from './touch-pan-accumulator';

const CELL_WIDTH = 90;
const CELL_HEIGHT = 30;

describe('TouchPanAccumulator', () => {
  let accumulator: TouchPanAccumulator;

  beforeEach(() => {
    accumulator = new TouchPanAccumulator();
  });

  it('reports no step while the gesture stays below one cell', () => {
    expect(accumulator.consume(-25, -10, CELL_WIDTH, CELL_HEIGHT)).toEqual({
      columns: 0,
      rows: 0,
    });
  });

  it('carries the remainder over, so a slow drag still advances', () => {
    accumulator.consume(-25, -10, CELL_WIDTH, CELL_HEIGHT);

    expect(accumulator.consume(-70, -25, CELL_WIDTH, CELL_HEIGHT)).toEqual({
      columns: 1,
      rows: 1,
    });
  });

  it('inverts the sign, because the finger moves the content and not the viewport', () => {
    expect(
      accumulator.consume(CELL_WIDTH * 2, CELL_HEIGHT * 3, CELL_WIDTH, CELL_HEIGHT),
    ).toEqual({ columns: -2, rows: -3 });
  });

  it('keeps only the sub-cell rest after a step', () => {
    accumulator.consume(-(CELL_WIDTH + 10), 0, CELL_WIDTH, CELL_HEIGHT);

    expect(accumulator.consume(-(CELL_WIDTH - 10), 0, CELL_WIDTH, CELL_HEIGHT)).toEqual({
      columns: 1,
      rows: 0,
    });
  });

  it('reports no step while the cell metrics are not usable yet', () => {
    expect(accumulator.consume(-500, -500, 0, 0)).toEqual({ columns: 0, rows: 0 });
  });

  it('drops the remainder on reset', () => {
    accumulator.consume(-(CELL_WIDTH - 1), 0, CELL_WIDTH, CELL_HEIGHT);
    accumulator.reset();

    expect(accumulator.consume(-1, 0, CELL_WIDTH, CELL_HEIGHT)).toEqual({
      columns: 0,
      rows: 0,
    });
  });
});
