// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ILLMFunctionExecuteRequest {
  functionName: string;
  parameters: Record<string, any>;
  language?: string;
}
