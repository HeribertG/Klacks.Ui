// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Voice service abstraction for plugins with voice input (speech recognition state: plugin-speech-service.interface.ts).
 * @param IPluginVoiceService - Controls voice mode (toggle, status, initialization)
 */

import { IPluginVoiceCallbacks } from './plugin-voice-callbacks.interface';
import { Subject } from 'rxjs';

export interface IPluginVoiceService {
  voiceModeEnabled: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  initialize(callbacks: IPluginVoiceCallbacks, destroy$: Subject<void>): void;
  toggleVoiceMode(): Promise<void>;
  disableVoiceMode(): void;
  isUsingWhisper(): boolean;
}
