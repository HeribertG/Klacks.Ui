// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { resolveLocalTtsVoiceLabel } from './local-tts-voice-label.helper';
import { LOCAL_TTS_KEYS } from 'src/app/domain/constants/local-tts.constants';

describe('resolveLocalTtsVoiceLabel', () => {
  it('maps a female voice to its number', () => {
    expect(resolveLocalTtsVoiceLabel('supertonic:F3')).toEqual({ key: LOCAL_TTS_KEYS.VOICE_FEMALE, number: 3 });
  });

  it('maps a male voice to its number', () => {
    expect(resolveLocalTtsVoiceLabel('supertonic:M5')).toEqual({ key: LOCAL_TTS_KEYS.VOICE_MALE, number: 5 });
  });

  it.each(['de-CH-LeniNeural', 'auto', 'supertonic:X1', 'supertonic:F'])('leaves "%s" alone', (voiceId) => {
    expect(resolveLocalTtsVoiceLabel(voiceId)).toBeNull();
  });
});
