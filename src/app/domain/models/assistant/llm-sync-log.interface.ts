// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Full sync-run log entry including per-model test results, used for the admin log card.
 * @param id - Unique notification identifier
 * @param providerId - Internal provider identifier (e.g. "openai")
 * @param providerName - Human-readable provider name
 * @param newModelsCount - Total models inserted (passed + failed test)
 * @param failedModelsCount - Models inserted as disabled because test failed
 * @param deactivatedModelsCount - Existing models disabled because no longer in provider API
 * @param syncedAt - UTC timestamp of the sync run
 * @param modelTestResults - Individual test result for each newly discovered model
 */
export interface ILLMSyncLogEntry {
  id: string;
  providerId: string;
  providerName: string;
  newModelsCount: number;
  failedModelsCount: number;
  deactivatedModelsCount: number;
  syncedAt: string;
  modelTestResults: ILLMModelTestResult[];
}

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
