// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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

import { ILLMModelTestResult } from './llm-model-test-result.interface';
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
