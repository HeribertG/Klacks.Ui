// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain models for Wizard 3 (LLM-driven schedule harmonizer) MVP.
 * Mirror the DTOs returned by /api/backend/Wizard3/Run and /ApplyAsScenario.
 */

export interface Wizard3RunRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  analyseToken: string | null;
  language: string | null;
}

export interface Wizard3SwapDto {
  rowA: number;
  dayA: number;
  rowB: number;
  dayB: number;
  reason: string;
}

export interface Wizard3RejectionDto {
  swap: Wizard3SwapDto;
  reason: string;
  detail: string;
}

export interface Wizard3RunResponse {
  jobId: string;
  llmModelId: string;
  fitnessBefore: number;
  fitnessAfter: number;
  acceptedSwaps: Wizard3SwapDto[];
  rejectedSwaps: Wizard3RejectionDto[];
  llmParsingError: string | null;
  llmRawResponsePreview: string | null;
}

export interface Wizard3ApplyRequest {
  jobId: string;
  groupId: string | null;
}

export interface Wizard3ApplyResponse {
  scenarioId: string;
  scenarioToken: string;
  scenarioName: string;
  runGroupId: string | null;
  createdWorkIds: string[];
}

export type Wizard3Status = 'idle' | 'running' | 'completed' | 'failed';

export interface Wizard3ModelCheckDto {
  modelId: string;
  displayName: string;
  providerId: string;
  isHealthy: boolean;
  latencyMs: number;
  error: string | null;
}

export interface Wizard3ModelCheckResponse {
  models: Wizard3ModelCheckDto[];
}
