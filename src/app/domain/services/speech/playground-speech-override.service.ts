// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Speech settings as the voice pipeline must use them. On the public playground the cost-free engines are forced
 * (in-browser Whisper for STT, Edge for TTS, automatic voice) regardless of the stored settings; elsewhere the stored
 * settings pass through unchanged. The stored settings themselves are never modified.
 * @param speechSettings - Returns the effective speech settings for STT, TTS and output handling
 */
import { inject, Injectable } from '@angular/core';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';
import { VoiceId } from 'src/app/domain/constants/voice-id.constants';
import { ISpeechSettings } from 'src/app/domain/models/settings/speech-settings.interface';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Injectable({ providedIn: 'root' })
export class PlaygroundSpeechOverrideService {
  private readonly settings = inject(AppSettingsManagementService);
  private readonly playground = inject(PlaygroundDeviceService);

  speechSettings(): ISpeechSettings {
    const stored = this.settings.speechSettings();
    if (!this.playground.limitActive()) {
      return stored;
    }
    return {
      ...stored,
      sttEngine: SttEngine.Browser,
      ttsProvider: TtsProvider.Edge,
      ttsVoice: VoiceId.Auto,
    };
  }
}
