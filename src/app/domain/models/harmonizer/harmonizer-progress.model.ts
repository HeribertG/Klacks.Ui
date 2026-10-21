// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface HarmonizerProgress {
  jobId: string;
  generation: number;
  maxGenerations: number;
  bestFitness: number;
  earlyStopping: boolean;
}
