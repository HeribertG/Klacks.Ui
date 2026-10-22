// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ILLMFunctionExecuteRequest {
  functionName: string;
  parameters: Record<string, unknown>;
  language?: string;
}
