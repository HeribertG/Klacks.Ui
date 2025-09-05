export interface LLMModel {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure';
  costPerInputToken: number;  // in EUR per 1000 tokens
  costPerOutputToken: number; // in EUR per 1000 tokens
  maxTokens: number;
  isEnabled: boolean;
  isDefault?: boolean;
}

export interface LLMModelUsage {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
  conversationId: string;
}

export const DEFAULT_MODELS: LLMModel[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective for most tasks',
    provider: 'openai',
    costPerInputToken: 0.0015,
    costPerOutputToken: 0.002,
    maxTokens: 4096,
    isEnabled: true,
    isDefault: true
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Most capable model for complex tasks',
    provider: 'openai',
    costPerInputToken: 0.03,
    costPerOutputToken: 0.06,
    maxTokens: 8192,
    isEnabled: true
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and affordable for simple tasks',
    provider: 'anthropic',
    costPerInputToken: 0.00025,
    costPerOutputToken: 0.00125,
    maxTokens: 200000,
    isEnabled: false
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced performance and capability',
    provider: 'anthropic',
    costPerInputToken: 0.003,
    costPerOutputToken: 0.015,
    maxTokens: 200000,
    isEnabled: false
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast and efficient for quick tasks',
    provider: 'google',
    costPerInputToken: 0.000075,
    costPerOutputToken: 0.0003,
    maxTokens: 1000000,
    isEnabled: true
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Most capable Google model',
    provider: 'google',
    costPerInputToken: 0.00125,
    costPerOutputToken: 0.005,
    maxTokens: 2000000,
    isEnabled: true
  }
];