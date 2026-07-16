// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for AudioCaptureService signal state, basic lifecycle, and device-selection behaviour.
 */
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AudioCaptureService } from './audio-capture.service';
import { SpeechDefaults } from 'src/app/domain/constants/speech-constants';
import { MicrophoneSelectionService } from 'src/app/domain/services/speech/microphone-selection.service';

describe('AudioCaptureService', () => {
  let service: AudioCaptureService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AudioCaptureService],
    });
    service = TestBed.inject(AudioCaptureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start in non-capturing state', () => {
    expect(service.isCapturing()).toBe(false);
    expect(service.isSpeechDetected()).toBe(false);
  });

  it('should have default silence threshold of 1000ms (SpeechDefaults)', () => {
    expect(service.silenceThresholdMs()).toBe(1000);
    expect(service.silenceThresholdMs()).toBe(SpeechDefaults.SilenceThresholdMs);
  });

  it('should update silence threshold via setter', () => {
    service.setSilenceThresholdMs(2000);
    expect(service.silenceThresholdMs()).toBe(2000);
  });

  it('should clamp silence threshold below the minimum to 500ms', () => {
    service.setSilenceThresholdMs(100);
    expect(service.silenceThresholdMs()).toBe(SpeechDefaults.SilenceThresholdMinMs);
  });

  it('should clamp silence threshold above the maximum to 3000ms', () => {
    service.setSilenceThresholdMs(10000);
    expect(service.silenceThresholdMs()).toBe(SpeechDefaults.SilenceThresholdMaxMs);
  });

  it('should fall back to the default for non-finite silence threshold', () => {
    service.setSilenceThresholdMs(Number.NaN);
    expect(service.silenceThresholdMs()).toBe(SpeechDefaults.SilenceThresholdMs);
  });

  it('should stop cleanly when not capturing', () => {
    expect(() => service.stop()).not.toThrow();
    expect(service.isCapturing()).toBe(false);
  });

  describe('recorded blob access', () => {
    const WAV_HEADER_BYTES = 44;
    const BYTES_PER_SAMPLE = 2;
    interface RecordingAccess {
      recordedPcm: Int16Array[];
    }

    const seedRecording = (samples: number): void => {
      (service as unknown as RecordingAccess).recordedPcm = [new Int16Array(samples)];
    };

    it('peekRecordedBlob builds a WAV blob WITHOUT clearing the recording buffer', () => {
      seedRecording(1000);

      const first = service.peekRecordedBlob();
      const second = service.peekRecordedBlob();

      expect(first.size).toBe(WAV_HEADER_BYTES + 1000 * BYTES_PER_SAMPLE);
      expect(second.size).toBe(first.size);
      expect((service as unknown as RecordingAccess).recordedPcm.length).toBe(1);
    });

    it('takeRecordedBlob clears the recording buffer', () => {
      seedRecording(1000);

      const blob = service.takeRecordedBlob();

      expect(blob.size).toBe(WAV_HEADER_BYTES + 1000 * BYTES_PER_SAMPLE);
      expect((service as unknown as RecordingAccess).recordedPcm.length).toBe(0);
      expect(service.peekRecordedBlob().size).toBe(WAV_HEADER_BYTES);
    });

    it('peekRecordedBlob then takeRecordedBlob returns the same audio payload size', () => {
      seedRecording(2000);

      const peeked = service.peekRecordedBlob();
      const taken = service.takeRecordedBlob();

      expect(taken.size).toBe(peeked.size);
    });

    it('getRecordedDurationMs derives the duration from samples and the default rate', () => {
      seedRecording(SpeechDefaults.SampleRate);

      expect(service.getRecordedDurationMs()).toBe(SpeechDefaults.MillisecondsPerSecond);
    });

    it('getRecordedDurationMs is zero when nothing has been recorded', () => {
      expect(service.getRecordedDurationMs()).toBe(0);
    });
  });

  describe('device selection', () => {
    let getUserMediaMock: ReturnType<typeof vi.fn>;
    let originalMediaDevices: MediaDevices | undefined;
    let originalAudioContext: typeof AudioContext | undefined;

    beforeEach(() => {
      originalMediaDevices = navigator.mediaDevices;
      originalAudioContext = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext;
      localStorage.clear();

      getUserMediaMock = vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: () => undefined }],
      } as unknown as MediaStream);

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: getUserMediaMock,
          enumerateDevices: () => Promise.resolve([]),
        },
      });

      (window as unknown as { AudioContext: unknown }).AudioContext = function MockAudioContext() {
        return {
          createMediaStreamSource: () => ({ connect: () => undefined }),
          createScriptProcessor: () => ({
            connect: () => undefined,
            disconnect: () => undefined,
            onaudioprocess: null,
          }),
          createGain: () => ({
            connect: () => undefined,
            gain: { value: 0 },
          }),
          destination: {},
          sampleRate: 44100,
          close: () => Promise.resolve(),
        } as unknown as AudioContext;
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
      if (originalMediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: originalMediaDevices,
        });
      }
      if (originalAudioContext) {
        (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = originalAudioContext;
      }
    });

    it('passes deviceId constraint when selection is set', async () => {
      const selection = TestBed.inject(MicrophoneSelectionService);
      selection.selectDevice('mic-7');
      const capture = TestBed.inject(AudioCaptureService);

      await capture.start();

      const constraints = getUserMediaMock.mock.calls[0][0] as MediaStreamConstraints;
      const audio = constraints.audio as MediaTrackConstraints;
      expect(audio.deviceId).toEqual({ exact: 'mic-7' });

      capture.stop();
    });

    it('omits deviceId when selection is null', async () => {
      const selection = TestBed.inject(MicrophoneSelectionService);
      selection.selectDevice(null);
      const capture = TestBed.inject(AudioCaptureService);

      await capture.start();

      const constraints = getUserMediaMock.mock.calls[0][0] as MediaStreamConstraints;
      const audio = constraints.audio as MediaTrackConstraints;
      expect(audio.deviceId).toBeUndefined();

      capture.stop();
    });

    it('falls back and clears selection on OverconstrainedError', async () => {
      const overErr = new DOMException('overconstrained', 'OverconstrainedError');
      getUserMediaMock
        .mockRejectedValueOnce(overErr)
        .mockResolvedValueOnce({
          getTracks: () => [{ stop: () => undefined }],
        } as unknown as MediaStream);

      const selection = TestBed.inject(MicrophoneSelectionService);
      selection.selectDevice('ghost-device');
      const capture = TestBed.inject(AudioCaptureService);

      await capture.start();

      expect(getUserMediaMock).toHaveBeenCalledTimes(2);
      const second = getUserMediaMock.mock.calls[1][0] as MediaStreamConstraints;
      expect((second.audio as MediaTrackConstraints).deviceId).toBeUndefined();
      expect(selection.selectedDeviceId()).toBeNull();

      capture.stop();
    });
  });
});
