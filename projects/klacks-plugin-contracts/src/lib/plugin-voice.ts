// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Voice and speech service abstractions for plugins with voice input.
 * @param IPluginVoiceService - Controls voice mode (toggle, status, initialization)
 * @param IPluginSpeechService - Provides speech recognition state
 */

import { Subject } from 'rxjs';

export interface IPluginVoiceCallbacks {
  getInputText: () => string;
  setInputText: (text: string) => void;
  sendMessage: () => Promise<void> | void;
  getIsProcessing: () => boolean;
  detectChanges: () => void;
}

export interface IPluginVoiceService {
  voiceModeEnabled: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  initialize(callbacks: IPluginVoiceCallbacks, destroy$: Subject<void>): void;
  toggleVoiceMode(): Promise<void>;
  disableVoiceMode(): void;
  isUsingWhisper(): boolean;
}

export interface IPluginSpeechService {
  readonly isListening: boolean;
}
