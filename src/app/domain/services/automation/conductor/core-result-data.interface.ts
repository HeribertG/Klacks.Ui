// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CoreAssignment } from './core-assignment.interface';

export interface CoreResultData {
  assignments: CoreAssignment[];
  fitness: number;
  coverage: number;
  penaltyScore: number;
  hardViolations: number;
  finalGeneration: number;
  stopReason: string;
  message: string;
  timeElapsedMs: number;
}
