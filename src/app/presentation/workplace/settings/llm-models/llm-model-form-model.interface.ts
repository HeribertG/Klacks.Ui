// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface LLMModelFormModel {
  modelId: string;
  modelName: string;
  providerId: string;
  description: string;
  apiModelId: string;
  contextWindow: string;
  maxTokens: string;
  costPerInputToken: string;
  costPerOutputToken: string;
  providerApiKey: string;
  isEnabled: boolean;
  isDefault: boolean;
}
