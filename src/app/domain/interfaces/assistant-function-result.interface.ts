// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantFunctionResult {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}
