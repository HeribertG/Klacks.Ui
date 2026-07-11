// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manages a queue of TTS audio blobs for seamless sentence-by-sentence playback.
 * Supports prefetch of the next sentence and interrupt (stop + clear queue).
 * @param isPlaying - Signal indicating whether audio is currently playing
 * @param queueLength - Signal with the number of queued audio items
 */
import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SpeechDefaults } from 'src/app/domain/constants/speech-constants';

@Injectable({ providedIn: 'root' })
export class AudioQueueService implements OnDestroy {
  readonly isPlaying = signal(false);
  readonly queueLength = signal(0);
  readonly playbackFinished$ = new Subject<void>();

  private queue: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private sentenceGapTimer: ReturnType<typeof setTimeout> | null = null;

  enqueue(audioBlob: Blob): void {
    console.log('[VS] audio-queue enqueue, size=', audioBlob.size, 'type=', audioBlob.type);
    this.queue.push(audioBlob);
    this.queueLength.set(this.queue.length);

    if (!this.isPlaying()) {
      this.playNext();
    }
  }

  stop(): void {
    this.clearSentenceGapTimer();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      if (this.currentAudio.parentNode) {
        this.currentAudio.parentNode.removeChild(this.currentAudio);
      }
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
    this.currentAudio.style.display = 'none';
    document.body.appendChild(this.currentAudio);
    this.isPlaying.set(true);

    const detachCurrent = () => {
      const el = this.currentAudio;
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };

    this.currentAudio.onended = () => {
      console.log('[VS] audio-queue playback ended');
      detachCurrent();
      this.revokeObjectUrl();
      this.playNextAfterSentenceGap();
    };

    this.currentAudio.onerror = (ev) => {
      console.error('[VS] audio-queue playback ERROR', ev, this.currentAudio?.error);
      detachCurrent();
      this.revokeObjectUrl();
      this.playNext();
    };

    console.log('[VS] audio-queue starting play, url=', this.currentObjectUrl);
    const checkInterval = setInterval(() => {
      if (!this.currentAudio) {
        clearInterval(checkInterval);
        return;
      }
      console.log('[VS] audio-queue tick: currentTime=', this.currentAudio.currentTime.toFixed(2),
        'duration=', this.currentAudio.duration, 'paused=', this.currentAudio.paused,
        'muted=', this.currentAudio.muted, 'volume=', this.currentAudio.volume,
        'readyState=', this.currentAudio.readyState);
    }, 500);
    const origOnEnded = this.currentAudio.onended;
    this.currentAudio.onended = (e) => {
      clearInterval(checkInterval);
      if (origOnEnded) (origOnEnded as (this: GlobalEventHandlers, ev: Event) => unknown).call(this.currentAudio!, e);
    };

    this.currentAudio.play()
      .then(() => console.log('[VS] audio-queue play() promise resolved, paused=', this.currentAudio?.paused, 'volume=', this.currentAudio?.volume, 'muted=', this.currentAudio?.muted))
      .catch((err) => {
        clearInterval(checkInterval);
        console.error('[VS] audio-queue play() rejected:', err);
        this.playNext();
      });
  }

  /**
   * Inserts a short natural pause between finished and next sentence.
   * An empty queue skips the gap so playbackFinished$ fires without extra delay.
   */
  private playNextAfterSentenceGap(): void {
    if (this.queue.length === 0) {
      this.playNext();
      return;
    }
    this.clearSentenceGapTimer();
    this.sentenceGapTimer = setTimeout(() => {
      this.sentenceGapTimer = null;
      this.playNext();
    }, SpeechDefaults.SentenceGapMs);
  }

  private clearSentenceGapTimer(): void {
    if (this.sentenceGapTimer) {
      clearTimeout(this.sentenceGapTimer);
      this.sentenceGapTimer = null;
    }
  }

  private revokeObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}
