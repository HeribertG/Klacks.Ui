// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface WizardProgress {
  jobId: string;
  generation: number;
  maxGenerations: number;
  bestHardViolations: number;
  bestStage1Completion: number;
  bestStage2Score: number;
  earlyStopping: boolean;
}

export type WizardStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';
