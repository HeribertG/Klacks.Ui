// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ISuggestedReply {
  label: string;
  value: string;
}

export interface ISuggestedRepliesConfig {
  selectionMode: 'single' | 'multi' | 'date';
  prompt?: string;
  options: ISuggestedReply[];
}
