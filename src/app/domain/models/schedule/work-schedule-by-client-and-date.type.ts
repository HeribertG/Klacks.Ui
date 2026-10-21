// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from './schedule-cell.interface';

export type WorkScheduleByDate = Map<string, IScheduleCell[]>;
export type WorkScheduleByClientAndDate = Map<string, WorkScheduleByDate>;
