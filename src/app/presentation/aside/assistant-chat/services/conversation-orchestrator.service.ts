// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State machine orchestrating the voice conversation lifecycle.
 * States: IDLE → LISTENING → ENHANCING → PROCESSING → SPEAKING → LISTENING (loop).
 * Replaces VoiceModeService with deterministic state transitions and interrupt support.
 * @param state - Current state of the conversation (signal)
 * @param voiceModeEnabled - Whether voice mode is active
 * @param interimText - Live transcription preview while user speaks
 */
import { Injectable, OnDestroy, Signal, signal, computed, inject, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AudioCaptureService } from 'src/app/infrastructure/services/speech/audio-capture.service';
import { WhisperStreamingService } from 'src/app/infrastructure/services/speech/whisper-streaming.service';
import { SttStreamService } from 'src/app/infrastructure/api/assistant/data-stt-stream.service';
import { DataSttService } from 'src/app/infrastructure/api/assistant/data-stt.service';
import { DataTranscriptionService } from 'src/app/infrastructure/api/assistant/data-transcription.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import { AudioQueueService } from './audio-queue.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TranscriptSanitizerService } from 'src/app/domain/services/speech/transcript-sanitizer.service';
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
  isTextProcessing: Signal<boolean>;
}

@Injectable({ providedIn: 'root' })
export class ConversationOrchestratorService implements OnDestroy {
  private readonly audioCapture = inject(AudioCaptureService);
  private readonly whisper = inject(WhisperStreamingService);
  private readonly sttStream = inject(SttStreamService);
  private readonly dataStt = inject(DataSttService);
  private readonly transcription = inject(DataTranscriptionService);
  private readonly dataTts = inject(DataTtsService);
  private readonly audioQueue = inject(AudioQueueService);
  private readonly settings = inject(AppSettingsManagementService);
  private readonly transcriptSanitizer = inject(TranscriptSanitizerService);
  private readonly ngZone = inject(NgZone);

  readonly state = signal(ConversationState.Idle);
  readonly voiceModeEnabled = signal(false);
  readonly interimText = signal('');

  private textProcessingSignal: Signal<boolean> | null = null;
  readonly isTextProcessing = computed(() => this.textProcessingSignal?.() ?? false);

  private readonly messagesSignal = signal<readonly ChatMessage[]>([]);
  readonly messages: Signal<readonly ChatMessage[]> = this.messagesSignal.asReadonly();

  private readonly errorsSubject = new Subject<IVoiceShellErrorHint>();
  readonly errors$: Observable<IVoiceShellErrorHint> = this.errorsSubject.asObservable();

  /**
   * Append a single message to the conversation log. No-op if a message with the same id
   * is already present, since duplicate SignalR deliveries (e.g. stale connections still
   * registered for the same user) must not render the same proactive message twice.
   * @param message - The message to append; identity is preserved by id
   */
  addMessage(message: ChatMessage): void {
    this.messagesSignal.update((current) => {
      if (current.some((m) => m.id === message.id)) {
        return current;
      }
      return [...current, message];
    });
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
  private subscriptionsWired = false;
  private sentenceBuffer = '';
  private pendingSentences: string[] = [];
  private locale = SpeechDefaults.Locale;
  private synthesisChain: Promise<void> = Promise.resolve();
  private autoSpeakStreaming = false;

  initialize(callbacks: ConversationCallbacks, locale: string): void {
    console.log('[VS] orchestrator.initialize called, locale=', locale);
    this.callbacks = callbacks;
    this.textProcessingSignal = callbacks.isTextProcessing;
    this.locale = locale;
    this.audioCapture.setSilenceThresholdMs(this.settings.speechSettings().silenceThresholdMs);

    if (this.subscriptionsWired) {
      return;
    }
    this.subscriptionsWired = true;

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
    const inVoiceFlow =
      this.state() === ConversationState.Processing || this.state() === ConversationState.Speaking;
    if (!inVoiceFlow && !this.isAutoSpeakMode()) {
      return;
    }

    const speechSettings = this.settings.speechSettings();
    if (speechSettings.outputMode === OutputMode.Text) {
      return;
    }

    if (!inVoiceFlow) {
      this.autoSpeakStreaming = true;
    }

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

  /**
   * Whether the current stream was spoken sentence-by-sentence in auto-speak
   * (text mode with BothAuto output), so callers can skip the whole-message TTS fallback.
   * Stays true after playback ends and resets when the next stream starts via stopAutoSpeak.
   */
  isAutoSpeakStreaming(): boolean {
    return this.autoSpeakStreaming;
  }

  /**
   * Stop sentence-wise auto-speak playback and discard queued sentences.
   * No-op while voice mode is active or when auto-speak is not running.
   */
  stopAutoSpeak(): void {
    if (!this.autoSpeakStreaming) return;
    this.autoSpeakStreaming = false;
    this.audioQueue.stop();
    this.sentenceBuffer = '';
    this.pendingSentences = [];
    this.synthesisChain = Promise.resolve();
  }

  private isAutoSpeakMode(): boolean {
    return (
      !this.voiceModeEnabled() &&
      this.settings.speechSettings().outputMode === OutputMode.BothAuto
    );
  }

  onStreamDone(): void {
    if (this.sentenceBuffer.trim()) {
      const finalSentence = this.sentenceBuffer.trim();
      this.pendingSentences.push(finalSentence);
      this.synthesisChain = this.synthesisChain.then(() => this.synthesizeAndEnqueue(finalSentence));
      this.sentenceBuffer = '';
      if (this.state() === ConversationState.Processing) {
        this.state.set(ConversationState.Speaking);
      }
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

  async submitText(text: string): Promise<void> {
    if (!text.trim()) return;
    this.callbacks?.setInputText(text);
    await this.callbacks?.sendMessage();
  }

  ngOnDestroy(): void {
    const controller = this.callbacks?.getAbortController();
    if (controller) controller.abort();
    this.disable();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async enable(): Promise<void> {
    console.log('[VS] enable(), callbacks=', this.callbacks ? 'SET' : 'NULL');
    this.voiceModeEnabled.set(true);
    await this.transitionToListening();
  }

  private disable(): void {
    this.voiceModeEnabled.set(false);
    this.autoSpeakStreaming = false;
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
    console.log('[VS] transitionToListening, voiceModeEnabled=', this.voiceModeEnabled());
    if (!this.voiceModeEnabled()) return;

    this.state.set(ConversationState.Listening);
    this.interimText.set('');

    const speechSettings = this.settings.speechSettings();
    console.log('[VS] sttEngine=', speechSettings.sttEngine, 'outputMode=', speechSettings.outputMode);

    if (!this.usesBlobStt(speechSettings.sttEngine)) {
      try {
        console.log('[VS] connecting sttStream with locale=', this.locale);
        this.sttStream.connect(this.locale);
      } catch (err) {
        console.error('[VS] sttStream.connect threw', err);
        this.reportError({
          kind: 'stt-connection',
          i18nKey: 'klacksy.voice.errors.stt-failed',
          persistent: false,
        });
        return;
      }
    }

    try {
      console.log('[VS] audioCapture.start()');
      await this.audioCapture.start();
      console.log('[VS] audioCapture.start() returned OK, isCapturing=', this.audioCapture.isCapturing());
    } catch (err) {
      console.error('[VS] audioCapture.start() threw', err);
      this.reportError({
        kind: 'mic-permission',
        i18nKey: 'klacksy.voice.errors.microphone-denied',
        persistent: true,
      });
      this.voiceModeEnabled.set(false);
      this.state.set(ConversationState.Idle);
    }
  }

  /**
   * Engines that capture the full utterance and transcribe a single blob (local Whisper
   * or a buffered server REST provider) instead of streaming over a WebSocket.
   * @param engine - The configured STT engine identifier
   */
  private usesBlobStt(engine: string): boolean {
    return engine === SttEngine.Browser || engine === SttEngine.GroqWhisper;
  }

  private async onSilenceDetected(): Promise<void> {
    console.log('[VS] onSilenceDetected, state=', this.state(), 'callbacks=', this.callbacks ? 'SET' : 'NULL');
    if (this.state() !== ConversationState.Listening) return;

    const speechSettings = this.settings.speechSettings();

    if (this.usesBlobStt(speechSettings.sttEngine)) {
      const blob = this.audioCapture.takeRecordedBlob();
      this.audioCapture.stop();
      console.log('[VS] blob STT engine=', speechSettings.sttEngine, 'bytes=', blob.size);
      if (blob.size < 1000) {
        console.log('[VS] blob too small, loop back');
        await this.transitionToListening();
        return;
      }
      this.state.set(ConversationState.Enhancing);
      try {
        const text =
          speechSettings.sttEngine === SttEngine.Browser
            ? await this.whisper.transcribeBlob(blob, this.locale)
            : await this.dataStt.transcribe(blob, this.locale);
        console.log('[VS] blob STT result:', JSON.stringify(text));
        this.callbacks?.setInputText(text);
        this.callbacks?.detectChanges();
      } catch (err) {
        console.error('[VS] blob STT transcription failed', err);
        this.reportError({
          kind: 'stt-connection',
          i18nKey: 'klacksy.voice.errors.stt-failed',
          persistent: false,
        });
        await this.transitionToListening();
        return;
      }
    } else {
      this.audioCapture.stop();
      this.sttStream.disconnect();
    }

    const rawText = this.callbacks?.getInputText() || '';
    if (!rawText.trim() || this.transcriptSanitizer.isNonSpeech(rawText)) {
      this.callbacks?.setInputText('');
      await this.transitionToListening();
      return;
    }

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
      const speechSettings = this.settings.speechSettings();
      console.log('[VS] TTS synthesize:', JSON.stringify(sentence.slice(0, 40)), 'locale=', this.locale);
      const blob = await this.dataTts.synthesize({
        text: sentence,
        locale: this.locale,
        providerId: speechSettings.ttsProvider,
        voiceId: speechSettings.ttsVoice,
      });
      console.log('[VS] TTS synthesize result: blob=', blob ? `size=${blob.size} type=${blob.type}` : 'NULL');
      if (blob) {
        this.audioQueue.enqueue(blob);
      }
    } catch (err) {
      console.error('[VS] TTS synthesize threw', err);
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
