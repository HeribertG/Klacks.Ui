// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for AudioCaptureService signal state and basic lifecycle.
 */
import { TestBed } from '@angular/core/testing';
import { AudioCaptureService } from './audio-capture.service';

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

  it('should have default silence threshold of 1500ms', () => {
    expect(service.silenceThresholdMs()).toBe(1500);
  });

  it('should update silence threshold via setter', () => {
    service.setSilenceThresholdMs(2000);
    expect(service.silenceThresholdMs()).toBe(2000);
  });

  it('should stop cleanly when not capturing', () => {
    expect(() => service.stop()).not.toThrow();
    expect(service.isCapturing()).toBe(false);
  });
});
