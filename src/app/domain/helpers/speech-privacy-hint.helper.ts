// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Decides which speech services get plain text although the LLM pseudonymisation is on. Speech output is covered only
 * by the local provider; speech input only by the local engine (custom:{local plugin id}). The browser engine counts as
 * cloud because the origin of its recognition cannot be proven, and any other custom server cannot be proven local.
 */
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';
import { SpeechPrivacyHint } from 'src/app/domain/models/assistant/speech-privacy-hint.interface';

/**
 * @param pseudonymizationEnabled - Whether the LLM pseudonymisation is on
 * @param ttsProvider - Persisted text-to-speech provider id
 * @param sttEngine - Persisted speech-to-text engine (not the UI-only dropdown value)
 * @returns Which side sends plain text; both false while the pseudonymisation is off
 */
export function resolveSpeechPrivacyHint(
  pseudonymizationEnabled: boolean,
  ttsProvider: string,
  sttEngine: string,
): SpeechPrivacyHint {
  if (!pseudonymizationEnabled) {
    return { tts: false, stt: false };
  }
  return {
    tts: ttsProvider !== TtsProvider.Local,
    stt: !SttEngine.isLocalPlugin(sttEngine),
  };
}
