// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  isAvailable: boolean;
}
