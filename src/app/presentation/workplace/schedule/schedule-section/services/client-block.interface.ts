// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CellData } from './cell-data.interface';

export interface ClientBlock {
  name: string;
  slot1: string;
  slot2: string;
  slot3: string;
  subRows: CellData[][];
  neededRows: number;
}
