// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IAssistantFunctionResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}
