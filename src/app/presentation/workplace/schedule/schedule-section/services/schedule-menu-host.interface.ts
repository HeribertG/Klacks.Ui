// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';

export interface ScheduleMenuHost {
  readonly contextMenuRow: number;
  readonly contextMenuColumn: number;
  readonly contextMenuEntry: IScheduleCell | null | undefined;

  showSelectedShiftInShiftSection(): void;
  openContainerAt(
    row: number,
    column: number,
    entry: IScheduleCell | null | undefined,
  ): void;
  deleteBreakPlaceholder(): void;
  adoptBreakPlaceholder(absenceItemId?: string): void;
}
