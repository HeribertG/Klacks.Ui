// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISuggestedReply {
  label: string;
  value: string;
}

export interface ISuggestedRepliesConfig {
  selectionMode: 'single' | 'multi' | 'date' | 'number';
  prompt?: string;
  options: ISuggestedReply[];
  min?: number;
  max?: number;
  step?: number;
}
