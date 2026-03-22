// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Describes an LLM model with provider information, costs, and capabilities.
 * @param modelId - Unique identifier of the model at the provider
 * @param providerId - Identifier of the API provider (e.g. OpenAI, Anthropic)
 * @param capabilities - List of supported capabilities of the model
 */
export interface IAssistantModel {
  id?: string;
  modelId: string;
  apiModelId?: string;
  providerId: string;
  modelName: string;
  description?: string;
  contextWindow: number;
  maxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  isEnabled: boolean;
  isDefault: boolean;
  capabilities: string[];
  providerApiKey?: string;
  displayName?: string;
  maxOutputTokens?: number;
}
