/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ILLMFunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
  properties?: Record<string, ILLMFunctionParameter>;
  items?: ILLMFunctionParameter;
}

export interface ILLMFunctionDefinition {
  name: string;
  description: string;
  parameters: ILLMFunctionParameter[];
  category: 'navigation' | 'form' | 'data' | 'system' | 'utility' | 'backend' | 'ui';
  requiresAuth?: boolean;
  permissions?: string[];
}

export interface ILLMFunctionCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ILLMFunctionResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface ILLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ILLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ILLMToolResponse {
  tool_call_id: string;
  content: string;
}
