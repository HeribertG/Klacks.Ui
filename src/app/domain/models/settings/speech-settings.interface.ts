// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISpeechSettings {
  sttEngine: string;
  sttApiKeys: Record<string, string>;
  ttsVoice: string;
  ttsProvider: string;
  ttsApiKeys: Record<string, string>;
  transcriptionModel: string;
  transcriptionPrompt: string;
  enhancementEnabled: boolean;
  outputMode: string;
  silenceThresholdMs: number;
  bargeInEnabled: boolean;
}
