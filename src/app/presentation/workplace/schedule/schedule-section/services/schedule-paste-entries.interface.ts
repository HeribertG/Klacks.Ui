// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BreakCellParams } from 'src/app/domain/services/schedule/break-cell-params.interface';
import { ScheduleCellParams } from 'src/app/domain/services/schedule/schedule-cell-params.interface';

export interface ISchedulePasteEntries {
  workEntries: ScheduleCellParams[];
  breakEntries: BreakCellParams[];
}
