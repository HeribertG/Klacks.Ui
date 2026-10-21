// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISuggestedReply } from './suggested-reply.interface';

export interface ISuggestedRepliesConfig {
  selectionMode: 'single' | 'multi' | 'date' | 'number';
  prompt?: string;
  options: ISuggestedReply[];
  min?: number;
  max?: number;
  step?: number;
}
