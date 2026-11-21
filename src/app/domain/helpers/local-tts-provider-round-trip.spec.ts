// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { parseSettingsModels } from './app-settings-parsing.helper';
import { APP_SETTING_SERIALIZERS } from './app-settings-serialization.helper';
import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';

describe('local speech output provider setting', () => {
  it('keeps a stored local provider through parse and serialize (no fallback to Edge)', () => {
    const models = parseSettingsModels([{ id: '1', type: AppSetting.ASSISTANT_TTS_PROVIDER, value: TtsProvider.Local }]);

    expect(models.speech.ttsProvider).toBe(TtsProvider.Local);
    const serializer = APP_SETTING_SERIALIZERS.find((s) => s.key === AppSetting.ASSISTANT_TTS_PROVIDER)!;
    expect(serializer.serialize(models)).toBe(TtsProvider.Local);
  });

  it('never writes the pseudonymisation switch back', () => {
    expect(APP_SETTING_SERIALIZERS.some((s) => s.key === AppSetting.LLM_PSEUDONYMIZATION_ENABLED)).toBe(false);
  });
});
