// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { PLAYGROUND_DEVICE_HEADER } from 'src/app/domain/constants/playground.constants';
import { PlaygroundStatusGateService } from 'src/app/domain/services/playground/playground-status-gate.service';
import { PlaygroundSpeechOverrideService } from 'src/app/domain/services/speech/playground-speech-override.service';
import { TextToSpeechService } from './text-to-speech.service';

const STORED_SETTINGS = { ttsProvider: 'openai', ttsVoice: 'alloy' };
const PLAYGROUND_SETTINGS = { ttsProvider: 'edge', ttsVoice: 'auto' };
const MESSAGE_ID = 'message-1';
const LOCALE = 'de';

describe('TextToSpeechService', () => {
  let service: TextToSpeechService;
  let statusGate: PlaygroundStatusGateService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let effectiveSettings: { ttsProvider: string; ttsVoice: string };

  beforeEach(() => {
    effectiveSettings = STORED_SETTINGS;
    fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [{ provide: PlaygroundSpeechOverrideService, useValue: { speechSettings: () => effectiveSettings } }],
    });
    service = TestBed.inject(TextToSpeechService);
    statusGate = TestBed.inject(PlaygroundStatusGateService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the speech settings only after the playground status is known and sends no device header', async () => {
    // Arrange
    statusGate.begin();

    // Act
    const speaking = service.speak('Hello', MESSAGE_ID, LOCALE);
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    effectiveSettings = PLAYGROUND_SETTINGS;
    statusGate.end();
    await speaking;

    // Assert
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string>; body: string };
    expect(JSON.parse(init.body).providerId).toBe(PLAYGROUND_SETTINGS.ttsProvider);
    expect(init.headers[PLAYGROUND_DEVICE_HEADER]).toBeUndefined();
  });

  it('sends no request when it was stopped while waiting for the status', async () => {
    // Arrange
    statusGate.begin();
    const speaking = service.speak('Hello', MESSAGE_ID, LOCALE);

    // Act
    service.stop();
    statusGate.end();
    await speaking;

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.isLoading()).toBe(false);
  });
});
