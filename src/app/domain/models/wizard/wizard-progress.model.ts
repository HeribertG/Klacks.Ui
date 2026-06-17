// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';

export interface WizardProgress {
  jobId: string;
  generation: number;
  maxGenerations: number;
  bestHardViolations: number;
  bestStage1Completion: number;
  bestStage2Score: number;
  earlyStopping: boolean;
}

export interface WizardTokenResult {
  agentId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface WizardAuctionAward {
  agentId: string;
  date: string;
  shiftId: string;
  round: number;
  winningScore: number;
  firedRules: string[];
}

export interface WizardEscalation {
  agentId: string;
  date: string;
  ruleName: string;
  hint: string;
}

export interface WizardResult {
  jobId: string;
  finalHardViolations: number;
  finalStage1Completion: number;
  tokenCount: number;
  availableShiftSlots: number;
  tokens: WizardTokenResult[];
  awards?: WizardAuctionAward[];
  escalations?: WizardEscalation[];
  qualificationGaps?: QualificationGapDetail[];
}

export type WizardStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';
