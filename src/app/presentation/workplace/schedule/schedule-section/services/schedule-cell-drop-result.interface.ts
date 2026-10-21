// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScheduleCellDragSource } from './schedule-cell-drag-source.interface';

export type ScheduleCellDropAction = 'delete' | 'move' | 'cancel';

export interface ScheduleCellDropResult {
  source: ScheduleCellDragSource;
  action: ScheduleCellDropAction;
  targetRow?: number;
  targetClientId?: string;
}
