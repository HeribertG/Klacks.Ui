// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Notification for a completed LLM provider model sync run.
 * @param providerId - Internal provider identifier (e.g. "openai")
 * @param providerName - Human-readable provider name
 * @param newModelsCount - Number of models added during this sync
 * @param failedModelsCount - Number of newly added models that failed the test and were inserted as disabled
 * @param deactivatedModelsCount - Number of models disabled during this sync
 * @param newModelNames - Display names of newly added models
 * @param deactivatedModelNames - Display names of deactivated models
 * @param syncedAt - UTC timestamp of when the sync ran
 */
export interface ILLMSyncNotification {
  id: string;
  providerId: string;
  providerName: string;
  newModelsCount: number;
  failedModelsCount: number;
  deactivatedModelsCount: number;
  newModelNames: string[];
  deactivatedModelNames: string[];
  syncedAt: string;
}
