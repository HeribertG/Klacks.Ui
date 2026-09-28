// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAssignmentResult } from './assignment-result.model';

export interface IConductorResult {
  success: boolean;
  assignments: IAssignmentResult[];
  unassignedShifts: string[];
  coverage: number;
  avgMotivation: number;
  generations: number;
  message: string;
  stopReason?: string;
  timeElapsedMs?: number;
  penaltyScore?: number;
  hardViolations?: number;
}
