// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manages a queue of TTS audio blobs for seamless sentence-by-sentence playback.
 * Supports prefetch of the next sentence and interrupt (stop + clear queue).
 * @param isPlaying - Signal indicating whether audio is currently playing
 * @param queueLength - Signal with the number of queued audio items
 */
import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AudioQueueService implements OnDestroy {
  readonly isPlaying = signal(false);
  readonly queueLength = signal(0);
  readonly playbackFinished$ = new Subject<void>();

  private queue: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;

  enqueue(audioBlob: Blob): void {
    console.log('[VS] audio-queue enqueue, size=', audioBlob.size, 'type=', audioBlob.type);
    this.queue.push(audioBlob);
    this.queueLength.set(this.queue.length);

    if (!this.isPlaying()) {
      this.playNext();
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.revokeObjectUrl();
    this.queue = [];
    this.queueLength.set(0);
    this.isPlaying.set(false);
  }

  ngOnDestroy(): void {
    this.stop();
    this.playbackFinished$.complete();
  }

  private playNext(): void {
    if (this.queue.length === 0) {
      this.isPlaying.set(false);
      this.playbackFinished$.next();
      return;
    }

    const blob = this.queue.shift()!;
    this.queueLength.set(this.queue.length);
    this.revokeObjectUrl();

    this.currentObjectUrl = URL.createObjectURL(blob);
    this.currentAudio = new Audio(this.currentObjectUrl);
    this.currentAudio.volume = 1.0;
    this.isPlaying.set(true);

    const audioEl = this.currentAudio as HTMLAudioElement & {
      setSinkId?: (id: string) => Promise<void>;
    };
    if (typeof audioEl.setSinkId === 'function') {
      audioEl.setSinkId('default').catch((err) => {
        console.warn('[VS] setSinkId("default") failed', err);
      });
    }

    this.currentAudio.onended = () => {
      console.log('[VS] audio-queue playback ended');
      this.revokeObjectUrl();
      this.playNext();
    };

    this.currentAudio.onerror = (ev) => {
      console.error('[VS] audio-queue playback ERROR', ev, this.currentAudio?.error);
      this.revokeObjectUrl();
      this.playNext();
    };

    console.log('[VS] audio-queue starting play, url=', this.currentObjectUrl);
    this.currentAudio.play()
      .then(() => console.log('[VS] audio-queue play() promise resolved'))
      .catch((err) => {
        console.error('[VS] audio-queue play() rejected:', err);
        this.playNext();
      });
  }

  private revokeObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}
