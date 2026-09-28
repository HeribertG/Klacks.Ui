// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from './shift.model';
import { IScheduleAgent } from '../agent/schedule-agent.model';

export interface IConductorContext {
  startDate: Date;
  endDate: Date;
  shifts: IShift[];
  agents: IScheduleAgent[];
}
