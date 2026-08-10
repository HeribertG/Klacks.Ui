// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
