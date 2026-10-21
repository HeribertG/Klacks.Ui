// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IWorkerResultData {
  assignments: { shiftId: string; agentId: string; motivationScore: number }[];
  coverage: number;
  finalGeneration: number;
  message: string;
  stopReason: string;
  timeElapsedMs: number;
  penaltyScore: number;
  hardViolations: number;
}
