// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  HOLISTIC_HARMONIZER_MODE,
  HolisticHarmonizerMode,
} from 'src/app/domain/constants/holistic-harmonizer-mode.constants';

/**
 * Holistic Harmonizer (wizard stage 3) global app settings.
 * @param mode - Stage-3 method: deterministic local search (default, no AI) or the LLM vision engine
 * @param llmModelId - Selected LLM model id (matches LLMModel.modelId from /api/backend/assistant/models); used only in LLM mode
 */
export interface IHolisticHarmonizerSettings {
  mode: HolisticHarmonizerMode;
  llmModelId: string;
}

export class HolisticHarmonizerSettings implements IHolisticHarmonizerSettings {
  mode: HolisticHarmonizerMode = HOLISTIC_HARMONIZER_MODE.deterministic;
  llmModelId = '';
}
