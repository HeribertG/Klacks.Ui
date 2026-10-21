// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGridRowHeader } from './grid-row-header.interface';

export class GridRowHeader implements IGridRowHeader {
  lastRow = 0;
  firstRow = 0;
  img = undefined;
}
