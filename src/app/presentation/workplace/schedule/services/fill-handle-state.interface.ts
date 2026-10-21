// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';

export interface FillHandleState {
  isDragging: boolean;
  startPosition: MyPosition | null;
  currentColumn: number;
  sourceEntryId: string | null;
  sourceWorkTime: number;
  sourceEntryType: number;
}
