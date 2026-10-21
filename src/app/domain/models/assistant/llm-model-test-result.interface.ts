// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Test result for a single model during a sync run.
 * @param apiModelId - Provider-side model identifier
 * @param modelName - Human-readable model name
 * @param passed - True when the completion test succeeded
 * @param errorMessage - Failure reason; null when passed is true
 * @param durationMs - Test duration in milliseconds
 */
export interface ILLMModelTestResult {
  apiModelId: string;
  modelName: string;
  passed: boolean;
  errorMessage?: string;
  durationMs: number;
}
