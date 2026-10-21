// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IPluginSpeechService {
  readonly isListening: boolean;
  isTranscribing(): boolean;
  isSupported$(): boolean;
}
