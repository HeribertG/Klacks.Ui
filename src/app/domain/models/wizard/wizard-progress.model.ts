// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface WizardProgress {
  jobId: string;
  generation: number;
  maxGenerations: number;
  bestHardViolations: number;
  bestStage1Completion: number;
  bestStage2Score: number;
  earlyStopping: boolean;
}

export interface WizardResult {
  jobId: string;
  finalHardViolations: number;
  finalStage1Completion: number;
  tokenCount: number;
}

export type WizardStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';
