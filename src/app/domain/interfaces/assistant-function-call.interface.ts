// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantFunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
