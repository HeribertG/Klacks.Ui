// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';
import { VoiceId } from 'src/app/domain/constants/voice-id.constants';
import { SpeechSettings } from 'src/app/domain/models/settings/speech-settings.model';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { PlaygroundSpeechOverrideService } from './playground-speech-override.service';

const PAID_VOICE = 'some-elevenlabs-voice';

describe('PlaygroundSpeechOverrideService', () => {
  const limitActive = signal(false);
  const stored = signal(new SpeechSettings());
  let service: PlaygroundSpeechOverrideService;

  beforeEach(() => {
    limitActive.set(false);
    const paid = new SpeechSettings();
    paid.sttEngine = SttEngine.Deepgram;
    paid.ttsProvider = TtsProvider.ElevenLabs;
    paid.ttsVoice = PAID_VOICE;
    paid.bargeInEnabled = true;
    stored.set(paid);
    TestBed.configureTestingModule({
      providers: [
        { provide: AppSettingsManagementService, useValue: { speechSettings: stored } },
        { provide: PlaygroundDeviceService, useValue: { limitActive } },
      ],
    });
    service = TestBed.inject(PlaygroundSpeechOverrideService);
  });

  it('passes the stored settings through unchanged while the limit is inactive', () => {
    expect(service.speechSettings()).toBe(stored());
  });

  it('forces browser STT and Edge TTS with the automatic voice while the limit is active', () => {
    // Act
    limitActive.set(true);

    // Assert
    const effective = service.speechSettings();
    expect(effective.sttEngine).toBe(SttEngine.Browser);
    expect(effective.ttsProvider).toBe(TtsProvider.Edge);
    expect(effective.ttsVoice).toBe(VoiceId.Auto);
  });

  it('keeps every other setting and never modifies the stored settings', () => {
    // Act
    limitActive.set(true);

    // Assert
    expect(service.speechSettings().bargeInEnabled).toBe(true);
    expect(stored().sttEngine).toBe(SttEngine.Deepgram);
    expect(stored().ttsProvider).toBe(TtsProvider.ElevenLabs);
    expect(stored().ttsVoice).toBe(PAID_VOICE);
  });
});
