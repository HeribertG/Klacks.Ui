// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';

export interface HarmonizerProgress {
  jobId: string;
  generation: number;
  maxGenerations: number;
  bestFitness: number;
  earlyStopping: boolean;
}

export interface HarmonizerRowResult {
  agentId: string;
  scoreBefore: number;
  scoreAfter: number;
  emergencyUnlockTriggered: boolean;
}

export interface HarmonizerResult {
  jobId: string;
  globalFitnessBefore: number;
  globalFitnessAfter: number;
  generationsRun: number;
  rowResults: HarmonizerRowResult[];
  qualificationGaps?: QualificationGapDetail[];
}

export type HarmonizerStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';
