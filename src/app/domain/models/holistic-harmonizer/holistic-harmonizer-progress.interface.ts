// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface HolisticHarmonizerProgress {
  jobId: string;
  iterationIndex: number;
  maxIterations: number;
  bestFitness: number;
  acceptedBatchCount: number;
  rejectedBatchCount: number;
  elapsedMs: number;
}
