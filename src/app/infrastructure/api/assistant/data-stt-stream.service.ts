// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * WebSocket client for streaming audio to the backend STT proxy and receiving transcription results.
 * @param transcript$ - Observable of transcription results (text, isFinal, confidence)
 * @param isConnected - Signal indicating WebSocket connection state
 */
import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

export interface SttTranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

@Injectable()
export class SttStreamService implements OnDestroy {
  readonly isConnected = signal(false);
  readonly transcript$ = new Subject<SttTranscriptResult>();
  readonly error$ = new Subject<string>();

  private ws: WebSocket | null = null;

  connect(locale: string = 'de'): void {
    if (this.ws) this.disconnect();

    const baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;
    const wsUrl = baseUrl.replace(/^http/, 'ws') + 'stt/stream';
    const token = localStorage.getItem(StorageKeys.TOKEN);

    this.ws = new WebSocket(`${wsUrl}?access_token=${token}&locale=${encodeURIComponent(locale)}`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => this.isConnected.set(true);

    this.ws.onmessage = (event: MessageEvent) => {
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
      }
    };

    this.ws.onclose = () => this.isConnected.set(false);
    this.ws.onerror = () => {
      this.error$.next('WebSocket connection error');
      this.isConnected.set(false);
    };
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
