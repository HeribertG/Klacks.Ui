// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftCellData } from './shift-cell-data.interface';

export interface ShiftBlock {
  name: string;
  slot1: string;
  slot2: string;
  slot3: string;
  cells: ShiftCellData[];
}
