// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
