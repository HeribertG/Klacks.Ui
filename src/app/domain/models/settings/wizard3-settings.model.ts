// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wizard 3 (LLM-driven schedule harmonizer) global app settings.
 * @param llmModelId - Selected LLM model id (matches LLMModel.modelId from /api/backend/assistant/models)
 */
export interface IWizard3Settings {
  llmModelId: string;
}

export class Wizard3Settings implements IWizard3Settings {
  llmModelId = '';
}
