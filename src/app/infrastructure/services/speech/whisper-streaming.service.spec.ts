// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for WhisperStreamingService silence-window configuration:
 * the blob-path chunking must share the SpeechDefaults source of truth
 * and clamp values to the supported range.
 */
import { TestBed } from '@angular/core/testing';
import { WhisperStreamingService } from './whisper-streaming.service';
import { SpeechDefaults } from 'src/app/domain/constants/speech-constants';

type SilenceDurationAccess = { silenceDurationMs: number };

describe('WhisperStreamingService', () => {
  let service: WhisperStreamingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [WhisperStreamingService] });
    service = TestBed.inject(WhisperStreamingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('defaults the silence window to SpeechDefaults.SilenceThresholdMs', () => {
    expect((service as unknown as SilenceDurationAccess).silenceDurationMs).toBe(SpeechDefaults.SilenceThresholdMs);
  });

  it('applies a configured silence window via setSilenceDurationMs', () => {
    service.setSilenceDurationMs(2000);
    expect((service as unknown as SilenceDurationAccess).silenceDurationMs).toBe(2000);
  });

  it('clamps out-of-range silence windows to the supported bounds', () => {
    service.setSilenceDurationMs(1);
    expect((service as unknown as SilenceDurationAccess).silenceDurationMs).toBe(SpeechDefaults.SilenceThresholdMinMs);

    service.setSilenceDurationMs(999999);
    expect((service as unknown as SilenceDurationAccess).silenceDurationMs).toBe(SpeechDefaults.SilenceThresholdMaxMs);
  });

  it('falls back to the default for non-finite values', () => {
    service.setSilenceDurationMs(Number.NaN);
    expect((service as unknown as SilenceDurationAccess).silenceDurationMs).toBe(SpeechDefaults.SilenceThresholdMs);
  });
});
