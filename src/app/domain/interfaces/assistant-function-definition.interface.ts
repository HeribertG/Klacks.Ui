// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAssistantFunctionParameter } from './assistant-function-definitions.interface';

export interface IAssistantFunctionDefinition {
  name: string;
  description: string;
  parameters: IAssistantFunctionParameter[];
  category: 'navigation' | 'form' | 'data' | 'system' | 'utility' | 'backend' | 'ui';
  requiresAuth?: boolean;
  permissions?: string[];
}
