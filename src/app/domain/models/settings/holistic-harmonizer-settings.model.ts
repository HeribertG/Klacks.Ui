// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holistic Harmonizer (LLM-driven schedule harmonizer) global app settings.
 * @param llmModelId - Selected LLM model id (matches LLMModel.modelId from /api/backend/assistant/models)
 */
export interface IHolisticHarmonizerSettings {
  llmModelId: string;
}

export class HolisticHarmonizerSettings implements IHolisticHarmonizerSettings {
  llmModelId = '';
}
