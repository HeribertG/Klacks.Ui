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

  describe('local voice answers', () => {
    let audioInstances: { src: string; play: ReturnType<typeof vi.fn> }[];
    let createdBlobs: Blob[];

    beforeEach(() => {
      audioInstances = [];
      createdBlobs = [];
      vi.stubGlobal(
        'Audio',
        class {
          readonly play = vi.fn().mockResolvedValue(undefined);
          onplay: (() => void) | null = null;
          onended: (() => void) | null = null;
          onerror: (() => void) | null = null;
          constructor(readonly src: string) {
            audioInstances.push(this);
          }
          pause(): void {}
        },
      );
      vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
        createdBlobs.push(blob as Blob);
        return 'blob:local-voice';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('plays a WAV answer with the media type the server sent', async () => {
      // Arrange
      const wav = new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'audio/wav' });
      fetchMock.mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(wav) });

      // Act
      await service.speak('Hallo', MESSAGE_ID, LOCALE);

      // Assert
      expect(createdBlobs).toEqual([wav]);
      expect(createdBlobs[0].type).toBe('audio/wav');
      expect(audioInstances).toHaveLength(1);
      expect(audioInstances[0].play).toHaveBeenCalled();
    });

    it('stays silent on 204 No Content without creating audio', async () => {
      // Arrange
      const blob = vi.fn();
      fetchMock.mockResolvedValue({ ok: true, status: 204, blob });

      // Act
      await service.speak('Bonġu', MESSAGE_ID, 'mt');

      // Assert
      expect(blob).not.toHaveBeenCalled();
      expect(audioInstances).toHaveLength(0);
      expect(service.isLoading()).toBe(false);
      expect(service.isPlaying()).toBe(false);
      expect(service.playingMessageId()).toBeNull();
    });

    it('stays silent on an empty audio body', async () => {
      // Arrange
      fetchMock.mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(new Blob([])) });

      // Act
      await service.speak('Hallo', MESSAGE_ID, LOCALE);

      // Assert
      expect(audioInstances).toHaveLength(0);
      expect(service.isLoading()).toBe(false);
    });
  });
});
