// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for AudioQueueService playback queue state management.
 */
import { TestBed } from '@angular/core/testing';
import { AudioQueueService } from './audio-queue.service';

describe('AudioQueueService', () => {
  let service: AudioQueueService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AudioQueueService],
    });
    service = TestBed.inject(AudioQueueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start in non-playing state', () => {
    expect(service.isPlaying()).toBe(false);
    expect(service.queueLength()).toBe(0);
  });

  it('should clear state on stop', () => {
    service.stop();
    expect(service.isPlaying()).toBe(false);
    expect(service.queueLength()).toBe(0);
  });

  it('should handle stop when nothing is queued', () => {
    expect(() => service.stop()).not.toThrow();
  });
});
