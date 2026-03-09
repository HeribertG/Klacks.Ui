// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Beschreibt ein LLM-Modell mit Provider-Informationen, Kosten und Fähigkeiten.
 * @param modelId - Eindeutige Kennung des Modells beim Provider
 * @param providerId - Kennung des API-Providers (z.B. OpenAI, Anthropic)
 * @param capabilities - Liste der unterstützten Fähigkeiten des Modells
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
