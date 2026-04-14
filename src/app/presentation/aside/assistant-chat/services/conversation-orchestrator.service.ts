// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State machine orchestrating the voice conversation lifecycle.
 * States: IDLE → LISTENING → ENHANCING → PROCESSING → SPEAKING → LISTENING (loop).
 * Replaces VoiceModeService with deterministic state transitions and interrupt support.
 * @param state - Current state of the conversation (signal)
 * @param voiceModeEnabled - Whether voice mode is active
 * @param interimText - Live transcription preview while user speaks
 */
import { Injectable, OnDestroy, Signal, signal, inject, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AudioCaptureService } from 'src/app/infrastructure/services/speech/audio-capture.service';
import { SttStreamService } from 'src/app/infrastructure/api/assistant/data-stt-stream.service';
import { DataTranscriptionService } from 'src/app/infrastructure/api/assistant/data-transcription.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import { AudioQueueService } from './audio-queue.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { SttEngine, OutputMode, SpeechDefaults } from 'src/app/domain/constants/speech-constants';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import { ChatMessage } from '../chat-message.interface';

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

@Injectable({ providedIn: 'root' })
export class ConversationOrchestratorService implements OnDestroy {
  private readonly audioCapture = inject(AudioCaptureService);
  private readonly sttStream = inject(SttStreamService);
  private readonly transcription = inject(DataTranscriptionService);
  private readonly dataTts = inject(DataTtsService);
  private readonly audioQueue = inject(AudioQueueService);
  private readonly settings = inject(AppSettingsManagementService);
  private readonly ngZone = inject(NgZone);

  readonly state = signal(ConversationState.Idle);
  readonly voiceModeEnabled = signal(false);
  readonly interimText = signal('');

  private readonly messagesSignal = signal<readonly ChatMessage[]>([]);
  readonly messages: Signal<readonly ChatMessage[]> = this.messagesSignal.asReadonly();

  private readonly errorsSubject = new Subject<IVoiceShellErrorHint>();
  readonly errors$: Observable<IVoiceShellErrorHint> = this.errorsSubject.asObservable();

  /**
   * Append a single message to the conversation log.
   * @param message - The message to append; identity is preserved by id
   */
  addMessage(message: ChatMessage): void {
    this.messagesSignal.update((current) => [...current, message]);
  }

  /**
   * Replace the entire conversation log (e.g. after a splice or filter).
   * @param next - New ordered list of messages
   */
  replaceMessages(next: readonly ChatMessage[]): void {
    this.messagesSignal.set([...next]);
  }

  /**
   * Patch a single existing message identified by id and notify subscribers
   * by replacing the array (signal-friendly alternative to in-place mutation).
   * No-op if the id is not present.
   * @param id - Message identifier
   * @param patch - Partial fields to merge over the existing message
   */
  updateMessage(id: string, patch: Partial<ChatMessage>): void {
    this.messagesSignal.update((current) => {
      const idx = current.findIndex((m) => m.id === id);
      if (idx < 0) return current;
      const next = current.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  /**
   * Drop all messages.
   */
  clearMessages(): void {
    this.messagesSignal.set([]);
  }

  private callbacks: ConversationCallbacks | null = null;
  private destroy$ = new Subject<void>();
  private sentenceBuffer = '';
  private pendingSentences: string[] = [];
  private locale = SpeechDefaults.Locale;
  private synthesisChain: Promise<void> = Promise.resolve();

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

    this.sttStream.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.ngZone.run(() => {
          this.reportError({
            kind: 'stt-connection',
            i18nKey: 'klacksy.voice.errors.stt-failed',
            persistent: false,
          });
        });
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

  /**
   * Start a voice session (enable voice mode).
   * Public alias over enable() so external UI can start without reaching into internals.
   */
  startSession(): Promise<void> {
    return this.enable();
  }

  /**
   * End the current voice session: aborts the in-flight SSE stream, disables voice mode,
   * and resets to Idle. Safe to call in any state.
   */
  endSession(): void {
    this.callbacks?.getAbortController()?.abort();
    this.disable();
  }

  /**
   * Interrupt in-flight speaking/processing and return to Listening.
   * Public alias over the existing interrupt() — kept for spec alignment.
   */
  interruptAndListen(): void {
    this.interrupt();
  }

  interrupt(): void {
    if (this.state() !== ConversationState.Speaking && this.state() !== ConversationState.Processing) return;

    this.audioQueue.stop();
    this.pendingSentences = [];
    this.sentenceBuffer = '';
    this.synthesisChain = Promise.resolve();

    const controller = this.callbacks?.getAbortController();
    if (controller) controller.abort();

    this.transitionToListening();
  }

  onStreamContent(text: string): void {
    if (this.state() !== ConversationState.Processing && this.state() !== ConversationState.Speaking) return;

    const speechSettings = this.settings.speechSettings();
    if (speechSettings.outputMode === OutputMode.Text) return;

    this.sentenceBuffer += text;
    const sentences = this.extractSentences();

    for (const sentence of sentences) {
      this.pendingSentences.push(sentence);
      this.synthesisChain = this.synthesisChain.then(() => this.synthesizeAndEnqueue(sentence));
    }

    if (this.state() === ConversationState.Processing && this.pendingSentences.length > 0) {
      this.state.set(ConversationState.Speaking);
    }
  }

  onStreamDone(): void {
    if (this.sentenceBuffer.trim()) {
      const finalSentence = this.sentenceBuffer.trim();
      this.pendingSentences.push(finalSentence);
      this.synthesisChain = this.synthesisChain.then(() => this.synthesizeAndEnqueue(finalSentence));
      this.sentenceBuffer = '';
    }

    if (this.settings.speechSettings().outputMode === OutputMode.Text || this.pendingSentences.length === 0) {
      this.transitionToListening();
    }
  }

  /**
   * Bridge invoked by AssistantChatComponent's SSE onError callback.
   * chatStreamService exposes callbacks instead of observables, so the component
   * forwards the SSE network error here to keep all error-hint emission centralized.
   */
  onStreamError(): void {
    this.reportError({
      kind: 'network',
      i18nKey: 'klacksy.voice.errors.network-failed',
      persistent: false,
    });
  }

  ngOnDestroy(): void {
    const controller = this.callbacks?.getAbortController();
    if (controller) controller.abort();
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
    this.synthesisChain = Promise.resolve();
  }

  private async transitionToListening(): Promise<void> {
    if (!this.voiceModeEnabled()) return;

    this.state.set(ConversationState.Listening);
    this.interimText.set('');

    const speechSettings = this.settings.speechSettings();

    if (speechSettings.sttEngine !== SttEngine.Browser) {
      try {
        this.sttStream.connect(this.locale);
      } catch {
        this.reportError({
          kind: 'stt-connection',
          i18nKey: 'klacksy.voice.errors.stt-failed',
          persistent: false,
        });
        return;
      }
    }

    try {
      await this.audioCapture.start();
    } catch {
      this.reportError({
        kind: 'mic-permission',
        i18nKey: 'klacksy.voice.errors.microphone-denied',
        persistent: true,
      });
      this.voiceModeEnabled.set(false);
      this.state.set(ConversationState.Idle);
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
    this.synthesisChain = Promise.resolve();
    await this.callbacks?.sendMessage();
  }

  private extractSentences(): string[] {
    const sentences: string[] = [];
    const regex = /[^.!?]+[.!?]\s*/g;
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
      const blob = await this.dataTts.synthesize({ text: sentence, locale: this.locale });
      if (blob) {
        this.audioQueue.enqueue(blob);
      }
    } catch {
      this.reportError({
        kind: 'tts-failure',
        i18nKey: 'klacksy.voice.errors.tts-failed',
        persistent: false,
      });
    } finally {
      const idx = this.pendingSentences.indexOf(sentence);
      if (idx >= 0) {
        this.pendingSentences.splice(idx, 1);
      }
    }
  }

  protected reportError(hint: IVoiceShellErrorHint): void {
    this.errorsSubject.next(hint);
  }
}
