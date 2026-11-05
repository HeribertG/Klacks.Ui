// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * WebSocket client for streaming audio to the backend STT proxy and receiving transcription results. The handshake is
 * authenticated by the HttpOnly session cookie (no token in the URL). A browser hides the status of a refused
 * handshake, so a socket that closes before it opened renews the session once through the shared single-flight
 * refresh and reconnects once; only when that fails too is the connection error reported.
 * @param transcript$ - Observable of transcription results (text, isFinal, confidence)
 * @param isConnected - Signal indicating WebSocket connection state
 * @param locale - Recognition language passed to the STT proxy
 */
import { inject, Injectable, Injector, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';
import { DataAuthService } from '../data-auth.service';

import { SttTranscriptResult } from './stt-transcript-result.interface';
import { SpeechDefaults } from 'src/app/domain/constants/speech-defaults.constants';

const CONNECTION_ERROR = 'WebSocket connection error';

@Injectable({ providedIn: 'root' })
export class SttStreamService implements OnDestroy {
  readonly isConnected = signal(false);
  readonly transcript$ = new Subject<SttTranscriptResult>();
  readonly error$ = new Subject<string>();

  private readonly injector = inject(Injector);
  private ws: WebSocket | null = null;

  connect(locale = SpeechDefaults.Locale): void {
    this.open(locale, true);
  }

  private open(locale: string, mayRenewSession: boolean): void {
    if (this.ws) this.disconnect();

    const baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;
    const wsUrl = baseUrl.replace(/^http/, 'ws') + 'stt/stream';

    const ws = new WebSocket(`${wsUrl}?locale=${encodeURIComponent(locale)}`);
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    let opened = false;

    ws.onopen = () => {
      opened = true;
      this.isConnected.set(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          this.error$.next(data.error);
          return;
        }
        this.transcript$.next({
          text: data.text,
          isFinal: data.isFinal,
          confidence: data.confidence,
        });
      } catch {
        this.error$.next('Failed to parse transcript payload');
      }
    };

    ws.onclose = () => {
      this.isConnected.set(false);
      if (!opened && mayRenewSession && this.ws === ws) {
        void this.renewAndReopen(ws, locale);
      }
    };
    ws.onerror = () => {
      this.isConnected.set(false);
      if (opened || !mayRenewSession) {
        this.error$.next(CONNECTION_ERROR);
      }
    };
  }

  private async renewAndReopen(failed: WebSocket, locale: string): Promise<void> {
    const outcome = await this.injector.get(DataAuthService).renewSession();
    if (this.ws !== failed) {
      return;
    }
    if (outcome === SessionRenewalOutcome.Renewed) {
      this.open(locale, false);
      return;
    }
    this.error$.next(CONNECTION_ERROR);
  }

  sendAudio(chunk: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected.set(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.transcript$.complete();
    this.error$.complete();
  }
}
