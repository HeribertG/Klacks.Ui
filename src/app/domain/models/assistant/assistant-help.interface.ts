// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantHelp {
  description: string;
  examples: {
    title: string;
    prompts: string[];
  }[];
  availableFunctions: string[];
  tips: string[];
}
