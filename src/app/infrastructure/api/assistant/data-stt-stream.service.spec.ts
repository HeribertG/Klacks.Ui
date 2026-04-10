// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for SttStreamService WebSocket state management.
 */
import { TestBed } from '@angular/core/testing';
import { SttStreamService } from './data-stt-stream.service';

describe('SttStreamService', () => {
  let service: SttStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SttStreamService],
    });
    service = TestBed.inject(SttStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start in disconnected state', () => {
    expect(service.isConnected()).toBe(false);
  });

  it('should disconnect cleanly when not connected', () => {
    expect(() => service.disconnect()).not.toThrow();
    expect(service.isConnected()).toBe(false);
  });

  it('should not send audio when disconnected', () => {
    const chunk = new ArrayBuffer(1024);
    expect(() => service.sendAudio(chunk)).not.toThrow();
  });
});
