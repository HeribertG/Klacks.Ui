// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { resolveSpeechPrivacyHint } from './speech-privacy-hint.helper';
import { isPseudonymizationEnabled } from './pseudonymization-setting.helper';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';
import { LocalSttPlugin } from 'src/app/domain/constants/local-stt-plugin.constants';
import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';

const OTHER_CUSTOM_ENGINE = `${SttEngine.CustomPrefix}11111111-1111-4111-8111-111111111111`;

describe('resolveSpeechPrivacyHint', () => {
  it('shows nothing while the pseudonymisation is off, whatever is selected', () => {
    expect(resolveSpeechPrivacyHint(false, TtsProvider.OpenAi, SttEngine.Deepgram)).toEqual({ tts: false, stt: false });
  });

  it('shows nothing when output and input are local', () => {
    expect(resolveSpeechPrivacyHint(true, TtsProvider.Local, SttEngine.LocalPluginEngine)).toEqual({ tts: false, stt: false });
  });

  it('treats the local engine as local regardless of the id casing', () => {
    const engine = `${SttEngine.CustomPrefix}${LocalSttPlugin.ProviderId.toUpperCase()}`;
    expect(resolveSpeechPrivacyHint(true, TtsProvider.Local, engine).stt).toBe(false);
  });

  it.each([TtsProvider.Edge, TtsProvider.OpenAi, TtsProvider.ElevenLabs, TtsProvider.Google])(
    'warns about the speech output for %s',
    (provider) => {
      expect(resolveSpeechPrivacyHint(true, provider, SttEngine.LocalPluginEngine)).toEqual({ tts: true, stt: false });
    },
  );

  it.each([SttEngine.Browser, SttEngine.Deepgram, SttEngine.GroqWhisper, SttEngine.AssemblyAi, OTHER_CUSTOM_ENGINE])(
    'warns about the speech input for %s',
    (engine) => {
      expect(resolveSpeechPrivacyHint(true, TtsProvider.Local, engine)).toEqual({ tts: false, stt: true });
    },
  );

  it('does not treat the UI-only local dropdown value as the local engine', () => {
    expect(resolveSpeechPrivacyHint(true, TtsProvider.Local, SttEngine.Local).stt).toBe(true);
  });
});

describe('isPseudonymizationEnabled', () => {
  const setting = (value: string) => [{ id: '1', type: AppSetting.LLM_PSEUDONYMIZATION_ENABLED, value }];

  it('is on when the setting is missing', () => {
    expect(isPseudonymizationEnabled([])).toBe(true);
  });

  it.each(['', 'true', 'TRUE', 'yes', 'garbage'])('is on for the stored value "%s"', (value) => {
    expect(isPseudonymizationEnabled(setting(value))).toBe(true);
  });

  it.each(['false', 'False', ' FALSE '])('is off only for "%s"', (value) => {
    expect(isPseudonymizationEnabled(setting(value))).toBe(false);
  });
});
