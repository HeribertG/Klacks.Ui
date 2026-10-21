// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IPluginVoiceCallbacks {
  getInputText: () => string;
  setInputText: (text: string) => void;
  sendMessage: () => Promise<void> | void;
  getIsProcessing: () => boolean;
  detectChanges: () => void;
}
