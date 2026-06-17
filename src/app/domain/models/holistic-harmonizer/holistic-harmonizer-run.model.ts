// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain models for Holistic Harmonizer (LLM-driven schedule harmonizer).
 * Mirror the DTOs returned by /api/backend/HolisticHarmonizer/Start (REST kick-off),
 * the SignalR completion payload (/hubs/holistic-harmonizer OnCompleted), and /ApplyAsScenario.
 */

import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';

export interface HolisticHarmonizerRunRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  analyseToken: string | null;
  language: string | null;
}

export interface HolisticHarmonizerSwapDto {
  rowA: number;
  dayA: number;
  rowB: number;
  dayB: number;
  reason: string;
}

export interface HolisticHarmonizerRejectionDto {
  swap: HolisticHarmonizerSwapDto;
  reason: string;
  detail: string;
}

export interface HolisticHarmonizerBatchDto {
  batchId: string;
  intent: string;
  result: string;
  appliedStepCount: number;
  rejectionCount: number;
  stoppedAtStep: number | null;
  scoreBefore: number;
  scoreAfter: number;
  appliedSwaps: HolisticHarmonizerSwapDto[];
  rejections: HolisticHarmonizerRejectionDto[];
}

export interface HolisticHarmonizerRunResponse {
  jobId: string;
  llmModelId: string;
  fitnessBefore: number;
  fitnessAfter: number;
  acceptedSwaps: HolisticHarmonizerSwapDto[];
  rejectedSwaps: HolisticHarmonizerRejectionDto[];
  batches: HolisticHarmonizerBatchDto[];
  agentDisplayNames: string[];
  qualificationGaps?: QualificationGapDetail[];
  llmParsingError: string | null;
  llmRawResponsePreview: string | null;
}

export interface HolisticHarmonizerApplyRequest {
  jobId: string;
  groupId: string | null;
}

export interface HolisticHarmonizerApplyResponse {
  scenarioId: string;
  scenarioToken: string;
  scenarioName: string;
  runGroupId: string | null;
  createdWorkIds: string[];
}

export type HolisticHarmonizerStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';

export interface HolisticHarmonizerProgress {
  jobId: string;
  iterationIndex: number;
  maxIterations: number;
  bestFitness: number;
  acceptedBatchCount: number;
  rejectedBatchCount: number;
  elapsedMs: number;
}

export interface StartHolisticHarmonizerResponse {
  jobId: string;
}

export interface CancelHolisticHarmonizerRequest {
  jobId: string;
}

export interface CancelHolisticHarmonizerResponse {
  cancelled: boolean;
}

export interface HolisticHarmonizerModelCheckDto {
  modelId: string;
  displayName: string;
  providerId: string;
  isHealthy: boolean;
  latencyMs: number;
  error: string | null;
}

export interface HolisticHarmonizerModelCheckResponse {
  models: HolisticHarmonizerModelCheckDto[];
}
