// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IAssistantFunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
  properties?: Record<string, IAssistantFunctionParameter>;
  items?: IAssistantFunctionParameter;
}

export interface IAssistantFunctionDefinition {
  name: string;
  description: string;
  parameters: IAssistantFunctionParameter[];
  category: 'navigation' | 'form' | 'data' | 'system' | 'utility' | 'backend' | 'ui';
  requiresAuth?: boolean;
  permissions?: string[];
}

export interface IAssistantFunctionCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface IAssistantFunctionResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface IAssistantToolDefinition {
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

export interface IAssistantToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface IAssistantToolResponse {
  tool_call_id: string;
  content: string;
}

export interface IAssistantFunctionDefinitionDto {
  id: string;
  name: string;
  description: string;
  parametersJson: string;
  requiredPermission: string | null;
  executionType: string;
  category: string;
  isEnabled: boolean;
  sortOrder: number;
}
