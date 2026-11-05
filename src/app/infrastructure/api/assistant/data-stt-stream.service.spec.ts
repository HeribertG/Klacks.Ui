// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for SttStreamService WebSocket state management.
 */
import { TestBed } from '@angular/core/testing';
import { SttStreamService } from './data-stt-stream.service';
import { DataAuthService } from '../data-auth.service';
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';

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

  describe('cookie-authenticated handshake', () => {
    const sockets: FakeWebSocket[] = [];

    class FakeWebSocket {
      binaryType = '';
      readyState = 0;
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      close = vi.fn();
      constructor(public readonly url: string) {
        sockets.push(this);
      }
      failBeforeOpen(): void {
        this.onerror?.();
        this.onclose?.();
      }
    }

    let renewSession: ReturnType<typeof vi.fn>;
    let errors: string[];

    beforeEach(() => {
      sockets.length = 0;
      vi.stubGlobal('WebSocket', FakeWebSocket);
      renewSession = vi.fn().mockResolvedValue(SessionRenewalOutcome.Renewed);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [SttStreamService, { provide: DataAuthService, useValue: { renewSession } }],
      });
      service = TestBed.inject(SttStreamService);
      errors = [];
      service.error$.subscribe((error) => errors.push(error));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('puts no access token into the URL', () => {
      service.connect('de-CH');

      expect(sockets[0].url).not.toContain('access_token');
      expect(sockets[0].url).toContain('locale=de-CH');
    });

    it('renews the session once and reconnects when the handshake is refused before open', async () => {
      service.connect('de-CH');
      sockets[0].failBeforeOpen();
      await vi.waitFor(() => expect(sockets.length).toBe(2));

      expect(renewSession).toHaveBeenCalledTimes(1);
      expect(errors).toEqual([]);

      sockets[1].failBeforeOpen();
      await Promise.resolve();
      expect(renewSession).toHaveBeenCalledTimes(1);
      expect(errors.length).toBe(1);
    });

    it('reports the connection error when the renewal fails', async () => {
      renewSession.mockResolvedValue(SessionRenewalOutcome.Rejected);

      service.connect('de-CH');
      sockets[0].failBeforeOpen();
      await vi.waitFor(() => expect(errors.length).toBe(1));

      expect(sockets.length).toBe(1);
    });

    it('does not renew after a deliberate disconnect', async () => {
      service.connect('de-CH');
      service.disconnect();
      sockets[0].onclose?.();
      await Promise.resolve();

      expect(renewSession).not.toHaveBeenCalled();
    });
  });
});
