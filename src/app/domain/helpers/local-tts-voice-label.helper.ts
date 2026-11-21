// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Translates a local voice id reported by the Api ("supertonic:F1" … "supertonic:M5") into a translation key plus
 * the voice number, so the dropdown shows "Voice 1 (female)" instead of the raw model name.
 */
import {
  LOCAL_TTS_FEMALE_VOICE_MARK,
  LOCAL_TTS_KEYS,
  LOCAL_TTS_VOICE_PREFIX,
} from 'src/app/domain/constants/local-tts.constants';
import { LocalTtsVoiceLabel } from 'src/app/domain/models/assistant/local-tts-voice-label.interface';

const VOICE_NAME_PATTERN = /^([FM])(\d+)$/i;

/**
 * @param voiceId - Voice id as returned by the voices endpoint
 * @returns The key and number for a local voice, or null for any other voice id
 */
export function resolveLocalTtsVoiceLabel(voiceId: string): LocalTtsVoiceLabel | null {
  if (!voiceId.toLowerCase().startsWith(LOCAL_TTS_VOICE_PREFIX)) {
    return null;
  }
  const match = VOICE_NAME_PATTERN.exec(voiceId.substring(LOCAL_TTS_VOICE_PREFIX.length));
  if (!match) {
    return null;
  }
  return {
    key: match[1].toUpperCase() === LOCAL_TTS_FEMALE_VOICE_MARK ? LOCAL_TTS_KEYS.VOICE_FEMALE : LOCAL_TTS_KEYS.VOICE_MALE,
    number: Number(match[2]),
  };
}
