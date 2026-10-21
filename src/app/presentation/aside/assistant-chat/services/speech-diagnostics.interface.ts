// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SpeechDiagnostics {
  isSupported: boolean;
  isSecureContext: boolean;
  browserName: string;
  isArmProcessor: boolean;
  speechRecognitionAvailable: boolean;
  webkitSpeechRecognitionAvailable: boolean;
  mediaDevicesAvailable: boolean;
  errorMessage?: string;
  useWhisperFallback: boolean;
}
