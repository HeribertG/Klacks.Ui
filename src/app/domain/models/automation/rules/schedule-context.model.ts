// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShiftAssignment } from './shift-assignment.model';
import { IWorkQuant } from './work-quant.model';

export interface IScheduleContext {
  agentId: string;
  currentDate: Date;
  proposedAssignment: IShiftAssignment;
  existingAssignments: IShiftAssignment[];
  workQuants: IWorkQuant[];
}
