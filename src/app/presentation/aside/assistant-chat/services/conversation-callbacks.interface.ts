// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Signal } from '@angular/core';
import type { TurnStopReason } from './turn-stop-reason.type';

export interface ConversationCallbacks {
  getInputText: () => string;
  setInputText: (text: string) => void;
  sendMessage: () => Promise<void>;
  getAbortController: () => AbortController | null;
  detectChanges: () => void;
  isTextProcessing: Signal<boolean>;
  stop: (reason: TurnStopReason) => void;
}
