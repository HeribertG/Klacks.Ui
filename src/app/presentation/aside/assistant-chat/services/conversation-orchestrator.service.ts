// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State machine orchestrating the voice conversation lifecycle.
 * States: IDLE → LISTENING → ENHANCING → PROCESSING → SPEAKING → LISTENING (loop).
 * Replaces VoiceModeService with deterministic state transitions and interrupt support.
 * @param state - Current state of the conversation (signal)
 * @param voiceModeEnabled - Whether voice mode is active
 * @param interimText - Live transcription preview while user speaks
 */
import { Injectable, OnDestroy, signal, inject, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { AudioCaptureService } from 'src/app/infrastructure/services/speech/audio-capture.service';
import { SttStreamService } from 'src/app/infrastructure/api/assistant/data-stt-stream.service';
import { DataTranscriptionService } from 'src/app/infrastructure/api/assistant/data-transcription.service';
import { AudioQueueService } from './audio-queue.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

export enum ConversationState {
  Idle = 'IDLE',
  Listening = 'LISTENING',
  Enhancing = 'ENHANCING',
  Processing = 'PROCESSING',
  Speaking = 'SPEAKING',
}

export interface ConversationCallbacks {
  getInputText: () => string;
  setInputText: (text: string) => void;
  sendMessage: () => Promise<void>;
  getAbortController: () => AbortController | null;
  detectChanges: () => void;
}

@Injectable()
export class ConversationOrchestratorService implements OnDestroy {
  private readonly audioCapture = inject(AudioCaptureService);
  private readonly sttStream = inject(SttStreamService);
  private readonly transcription = inject(DataTranscriptionService);
  private readonly audioQueue = inject(AudioQueueService);
  private readonly settings = inject(AppSettingsManagementService);
  private readonly ngZone = inject(NgZone);

  readonly state = signal(ConversationState.Idle);
  readonly voiceModeEnabled = signal(false);
  readonly interimText = signal('');

  private callbacks: ConversationCallbacks | null = null;
  private destroy$ = new Subject<void>();
  private sentenceBuffer = '';
  private pendingSentences: string[] = [];
  private locale = 'de';

  initialize(callbacks: ConversationCallbacks, locale: string): void {
    this.callbacks = callbacks;
    this.locale = locale;

    this.audioCapture.silenceDetected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.ngZone.run(() => this.onSilenceDetected()));

    this.sttStream.transcript$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.ngZone.run(() => {
          if (result.isFinal) {
            this.callbacks?.setInputText(result.text);
          } else {
            this.interimText.set(result.text);
          }
          this.callbacks?.detectChanges();
        });
      });

    this.audioQueue.playbackFinished$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.ngZone.run(() => {
          if (this.state() === ConversationState.Speaking && this.pendingSentences.length === 0) {
            this.transitionToListening();
          }
        });
      });

    this.audioCapture.audioChunk$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chunk => {
        if (this.state() === ConversationState.Listening) {
          this.sttStream.sendAudio(chunk);
        }
      });

    this.audioCapture.setSilenceThresholdMs(this.settings.speechSettings().silenceThresholdMs);
  }

  async toggleVoiceMode(): Promise<void> {
    if (this.voiceModeEnabled()) {
      this.disable();
    } else {
      await this.enable();
    }
  }

  interrupt(): void {
    if (this.state() !== ConversationState.Speaking && this.state() !== ConversationState.Processing) return;

    this.audioQueue.stop();
    this.pendingSentences = [];
    this.sentenceBuffer = '';

    const controller = this.callbacks?.getAbortController();
    if (controller) controller.abort();

    this.transitionToListening();
  }

  onStreamContent(text: string): void {
    if (this.state() !== ConversationState.Processing && this.state() !== ConversationState.Speaking) return;

    const speechSettings = this.settings.speechSettings();
    if (speechSettings.outputMode === 'text') return;

    this.sentenceBuffer += text;
    const sentences = this.extractSentences();

    for (const sentence of sentences) {
      this.pendingSentences.push(sentence);
      this.synthesizeAndEnqueue(sentence);
    }

    if (this.state() === ConversationState.Processing && this.pendingSentences.length > 0) {
      this.state.set(ConversationState.Speaking);
    }
  }

  onStreamDone(): void {
    if (this.sentenceBuffer.trim()) {
      const finalSentence = this.sentenceBuffer.trim();
      this.pendingSentences.push(finalSentence);
      this.synthesizeAndEnqueue(finalSentence);
      this.sentenceBuffer = '';
    }

    if (this.settings.speechSettings().outputMode === 'text' || this.pendingSentences.length === 0) {
      this.transitionToListening();
    }
  }

  ngOnDestroy(): void {
    this.disable();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async enable(): Promise<void> {
    this.voiceModeEnabled.set(true);
    await this.transitionToListening();
  }

  private disable(): void {
    this.voiceModeEnabled.set(false);
    this.audioQueue.stop();
    this.audioCapture.stop();
    this.sttStream.disconnect();
    this.state.set(ConversationState.Idle);
    this.interimText.set('');
    this.sentenceBuffer = '';
    this.pendingSentences = [];
  }

  private async transitionToListening(): Promise<void> {
    if (!this.voiceModeEnabled()) return;

    this.state.set(ConversationState.Listening);
    this.interimText.set('');

    const speechSettings = this.settings.speechSettings();
    if (speechSettings.sttEngine !== 'browser') {
      this.sttStream.connect();
      await this.audioCapture.start();
    } else {
      await this.audioCapture.start();
    }
  }

  private async onSilenceDetected(): Promise<void> {
    if (this.state() !== ConversationState.Listening) return;

    const rawText = this.callbacks?.getInputText() || '';
    if (!rawText.trim()) {
      await this.transitionToListening();
      return;
    }

    this.audioCapture.stop();
    this.sttStream.disconnect();

    const speechSettings = this.settings.speechSettings();

    if (speechSettings.enhancementEnabled) {
      this.state.set(ConversationState.Enhancing);
      try {
        const enhanced = await this.transcription.enhance(rawText, this.locale);
        this.callbacks?.setInputText(enhanced);
        this.callbacks?.detectChanges();
      } catch {
        // Keep raw text on failure
      }
    }

    this.state.set(ConversationState.Processing);
    this.sentenceBuffer = '';
    this.pendingSentences = [];
    await this.callbacks?.sendMessage();
  }

  private extractSentences(): string[] {
    const sentences: string[] = [];
    const regex = /[^.!?:]+[.!?:]\s*/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(this.sentenceBuffer)) !== null) {
      sentences.push(match[0].trim());
      lastIndex = match.index + match[0].length;
    }

    if (sentences.length > 0) {
      this.sentenceBuffer = this.sentenceBuffer.substring(lastIndex);
    }

    return sentences;
  }

  private async synthesizeAndEnqueue(sentence: string): Promise<void> {
    try {
      const baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;
      const token = localStorage.getItem(StorageKeys.TOKEN);

      const response = await fetch(`${baseUrl}tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: sentence, locale: this.locale }),
      });

      if (response.ok) {
        const blob = await response.blob();
        this.audioQueue.enqueue(blob);
      }
    } catch {
      // TTS failure — skip this sentence
    } finally {
      const idx = this.pendingSentences.indexOf(sentence);
      if (idx >= 0) {
        this.pendingSentences.splice(idx, 1);
      }
    }
  }
}
