// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface RawFunctionCall {
  FunctionName?: string;
  functionName?: string;
  Success?: boolean;
  success?: boolean;
  Parameters?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  UiActionSteps?: string;
  uiActionSteps?: string;
  UiActionTrackingId?: string;
  uiActionTrackingId?: string;
  Result?: unknown;
  result?: unknown;
}
