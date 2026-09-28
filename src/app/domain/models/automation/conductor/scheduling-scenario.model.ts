// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAssignment } from './assignment.model';

export interface ISchedulingScenario {
  id: string;
  generation: number;
  assignments: IAssignment[];
  fitness: number;
  coverage: number;
  avgMotivation: number;
  violationCount: number;
  unassignedShifts: string[];
  chromosome: Map<string, string | null>;
  penaltyScore: number;
  hardViolations: number;
}
