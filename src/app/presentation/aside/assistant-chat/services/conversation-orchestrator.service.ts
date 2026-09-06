// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State machine orchestrating the voice conversation lifecycle.
 * States: IDLE → LISTENING → ENHANCING → PROCESSING → SPEAKING → LISTENING (loop).
 * Replaces VoiceModeService with deterministic state transitions and interrupt support.
 * With barge-in enabled, the microphone keeps monitoring during PROCESSING/SPEAKING
 * (raised VAD threshold) and sustained user speech interrupts playback.
 * For server blob STT engines (Groq/custom), a provisional transcript of the audio
 * recorded so far is shown in the input field every few seconds while the user speaks;
 * the final transcription after silence detection stays authoritative.
 * @param state - Current state of the conversation (signal)
 * @param voiceModeEnabled - Whether voice mode is active
 * @param interimText - Live transcription preview while user speaks
 */
import { Injectable, OnDestroy, Signal, signal, computed, effect, inject, NgZone, untracked } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AudioCaptureService } from 'src/app/infrastructure/services/speech/audio-capture.service';
import { EarconService } from 'src/app/infrastructure/services/speech/earcon.service';
import { WhisperStreamingService } from 'src/app/infrastructure/services/speech/whisper-streaming.service';
import { SttStreamService } from 'src/app/infrastructure/api/assistant/data-stt-stream.service';
import { DataSttService } from 'src/app/infrastructure/api/assistant/data-stt.service';
import { DataTranscriptionService } from 'src/app/infrastructure/api/assistant/data-transcription.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import { AudioQueueService } from './audio-queue.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TranscriptSanitizerService } from 'src/app/domain/services/speech/transcript-sanitizer.service';
import { SttEngine, SpeechDefaults } from 'src/app/domain/constants/speech-constants';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import { ChatMessage } from '../chat-message.interface';

export enum ConversationState {
  Idle = 'IDLE',
  Listening = 'LISTENING',
  Enhancing = 'ENHANCING',
  Processing = 'PROCESSING',
  Planning = 'PLANNING',
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
  private readonly earcon = inject(EarconService);
  private readonly settings = inject(AppSettingsManagementService);
  private readonly outputModes = inject(SpeechOutputModeService);
  private readonly transcriptSanitizer = inject(TranscriptSanitizerService);
  private readonly ngZone = inject(NgZone);

  readonly state = signal(ConversationState.Idle);
  readonly voiceModeEnabled = signal(false);
  readonly interimText = signal('');

  private floatingModeActive = false;
  private textProcessingSignal: Signal<boolean> | null = null;
  readonly isTextProcessing = computed(() => this.textProcessingSignal?.() ?? false);

  private readonly isPlanningSignal = signal(false);
  readonly isPlanning = this.isPlanningSignal.asReadonly();

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
  private bargeInCandidateTimer: ReturnType<typeof setTimeout> | null = null;
  private bargeInTriggered = false;
  private interimTranscriptionTimer: ReturnType<typeof setInterval> | null = null;
  private interimRequestInFlight = false;
  private interimTickSequence = 0;
  private lastAppliedInterimSequence = 0;
  private interimEpoch = 0;

  initialize(callbacks: ConversationCallbacks, locale: string): void {
    console.log('[VS] orchestrator.initialize called, locale=', locale);
    this.callbacks = callbacks;
    this.textProcessingSignal = callbacks.isTextProcessing;
    this.locale = locale;
    this.applyConfiguredSilenceThreshold();

    if (this.subscriptionsWired) {
      return;
    }
    this.subscriptionsWired = true;

    this.audioCapture.silenceDetected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.ngZone.run(() => this.onSilenceDetected()));

    this.audioCapture.speechStarted$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.ngZone.run(() => this.onSpeechStarted()));

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

  constructor() {
    effect(() => {
      const floating = this.outputModes.isFloatingMode();
      const wasFloating = this.floatingModeActive;
      this.floatingModeActive = floating;
      if (wasFloating && !floating) {
        untracked(() => this.leaveFloatingMode());
      }
    });
  }

  /**
   * Silence a running voice session when the floating shell disappears — leaving the setup tour
   * open with an invisible microphone still listening would keep speaking over the tour.
   */
  private leaveFloatingMode(): void {
    this.stopAutoSpeak();
    if (this.voiceModeEnabled()) {
      this.endSession();
    }
  }

  /**
   * Update the speech locale used for STT and TTS after a UI language change.
   * @param locale - New speech locale (e.g. 'de', 'en')
   */
  setLocale(locale: string): void {
    this.locale = locale;
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

    this.isPlanningSignal.set(false);
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

    if (this.outputModes.isTextOnlyMode()) {
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
    return !this.voiceModeEnabled() && this.outputModes.isAutoSpeakMode();
  }

  onStreamDone(): void {
    this.isPlanningSignal.set(false);
    if (this.sentenceBuffer.trim()) {
      const finalSentence = this.sentenceBuffer.trim();
      this.pendingSentences.push(finalSentence);
      this.synthesisChain = this.synthesisChain.then(() => this.synthesizeAndEnqueue(finalSentence));
      this.sentenceBuffer = '';
      if (this.state() === ConversationState.Processing) {
        this.state.set(ConversationState.Speaking);
      }
    }

    if (this.outputModes.isTextOnlyMode() || this.pendingSentences.length === 0) {
      this.transitionToListening();
    }
  }

  /**
   * Bridge invoked by AssistantChatComponent's SSE onError callback.
   * chatStreamService exposes callbacks instead of observables, so the component
   * forwards the SSE network error here to keep all error-hint emission centralized.
   */
  onStreamError(): void {
    this.isPlanningSignal.set(false);
    this.reportError({
      kind: 'network',
      i18nKey: 'klacksy.voice.errors.network-failed',
      persistent: false,
    });
  }

  /**
   * Bridge invoked by AssistantChatComponent when the SSE stream emits a tool call.
   * Signals that Klacksy has entered the planning phase (executing a chain of tools)
   * so the voice-shell can surface a dedicated Planning state instead of a static
   * Processing state that reads as "frozen" during long tool loops.
   */
  onStreamFunctionCall(): void {
    this.isPlanningSignal.set(true);
  }

  /**
   * Bridge invoked when the model starts emitting answer content, which marks the end
   * of the tool-planning phase for the current turn. onStreamDone/onStreamError and
   * session teardown reset the flag as well, so it never stays stuck true.
   */
  onStreamPlanningEnded(): void {
    this.isPlanningSignal.set(false);
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
    this.isPlanningSignal.set(false);
    this.clearBargeInCandidateTimer();
    this.stopInterimTranscription();
    this.bargeInTriggered = false;
    this.audioCapture.setVadThresholdMultiplier(1);
    this.audioQueue.stop();
    this.audioCapture.stop();
    this.sttStream.disconnect();
    this.state.set(ConversationState.Idle);
    this.interimText.set('');
    this.sentenceBuffer = '';
    this.pendingSentences = [];
    this.synthesisChain = Promise.resolve();
  }

  /**
   * Pushes the configured silence window into both silence-detection paths
   * (PCM capture and browser Whisper blob chunking) so they share one source of truth.
   * Falls back to the clamped default when the setting is missing or out of range.
   */
  private applyConfiguredSilenceThreshold(): void {
    const configured = this.settings.speechSettings().silenceThresholdMs;
    const clamped = SpeechDefaults.clampSilenceThresholdMs(configured ?? SpeechDefaults.SilenceThresholdMs);
    this.audioCapture.setSilenceThresholdMs(clamped);
    this.whisper.setSilenceDurationMs(clamped);
  }

  private async transitionToListening(): Promise<void> {
    console.log('[VS] transitionToListening, voiceModeEnabled=', this.voiceModeEnabled());
    if (!this.voiceModeEnabled()) return;

    this.applyConfiguredSilenceThreshold();
    this.clearBargeInCandidateTimer();
    this.audioCapture.setVadThresholdMultiplier(1);
    if (!this.bargeInTriggered) {
      this.audioCapture.clearRecording();
    }
    this.bargeInTriggered = false;

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
   * or a buffered server REST provider, including custom self-hosted providers)
   * instead of streaming over a WebSocket.
   * @param engine - The configured STT engine identifier
   */
  private usesBlobStt(engine: string): boolean {
    return engine === SttEngine.Browser || engine === SttEngine.GroqWhisper || SttEngine.isCustom(engine);
  }

  private async onSilenceDetected(): Promise<void> {
    console.log('[VS] onSilenceDetected, state=', this.state(), 'callbacks=', this.callbacks ? 'SET' : 'NULL');
    if (this.state() !== ConversationState.Listening) return;

    this.stopInterimTranscription();

    const speechSettings = this.settings.speechSettings();

    if (this.usesBlobStt(speechSettings.sttEngine)) {
      const blob = this.audioCapture.takeRecordedBlob();
      this.audioCapture.stop();
      console.log('[VS] blob STT engine=', speechSettings.sttEngine, 'bytes=', blob.size);
      if (blob.size < SpeechDefaults.MinBlobBytes) {
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
      this.reportError({
        kind: 'stt-empty',
        i18nKey: 'klacksy.voice.errors.stt-empty',
        persistent: false,
      });
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
    this.playProcessingEarconIfAudible();
    this.sentenceBuffer = '';
    this.pendingSentences = [];
    this.synthesisChain = Promise.resolve();
    void this.startBargeInMonitorIfEnabled();
    await this.callbacks?.sendMessage();
  }

  /**
   * Subtle listening feedback: a short quiet earcon confirms "understood, thinking now"
   * when voice mode enters Processing. Skipped in text-only output mode, where the
   * user has opted out of any audible response.
   */
  private playProcessingEarconIfAudible(): void {
    if (!this.voiceModeEnabled()) return;
    if (this.outputModes.isTextOnlyMode()) return;
    this.earcon.playProcessingEarcon();
  }

  /**
   * Keep the microphone open during PROCESSING/SPEAKING with a raised VAD threshold
   * so the user can interrupt Klacksy by simply talking over the answer. The captured
   * chunks are not forwarded to STT while monitoring; on a confirmed barge-in the
   * recorded PCM is preserved so blob STT keeps the start of the user's sentence.
   */
  private async startBargeInMonitorIfEnabled(): Promise<void> {
    if (!this.voiceModeEnabled() || !this.settings.speechSettings().bargeInEnabled) return;

    this.audioCapture.setVadThresholdMultiplier(SpeechDefaults.BargeInVadThresholdMultiplier);
    try {
      await this.audioCapture.start();
      console.log('[VS] barge-in monitor active');
    } catch (err) {
      console.warn('[VS] barge-in monitor could not start microphone', err);
      this.audioCapture.setVadThresholdMultiplier(1);
    }
  }

  private onSpeechStarted(): void {
    if (this.state() === ConversationState.Listening) {
      this.startInterimTranscriptionIfEligible();
      return;
    }

    if (!this.isBargeInWatching()) return;

    this.clearBargeInCandidateTimer();
    this.bargeInCandidateTimer = setTimeout(
      () => this.ngZone.run(() => this.confirmBargeIn()),
      SpeechDefaults.BargeInMinSpeechDurationMs,
    );
  }

  /**
   * Engines whose blob is transcribed by a server REST provider (Groq or a custom
   * self-hosted provider). The browser Whisper engine is excluded: it produces its
   * own live interim results and must not be polled with partial blobs.
   * @param engine - The configured STT engine identifier
   */
  private usesServerBlobStt(engine: string): boolean {
    return engine === SttEngine.GroqWhisper || SttEngine.isCustom(engine);
  }

  /**
   * While the user is speaking, periodically transcribe the audio recorded so far
   * so a provisional transcript appears in the input field before silence is detected.
   * Partials are comfort only: the final transcription after silence stays authoritative.
   */
  private startInterimTranscriptionIfEligible(): void {
    if (this.interimTranscriptionTimer) return;
    if (!this.voiceModeEnabled()) return;
    if (!this.usesServerBlobStt(this.settings.speechSettings().sttEngine)) return;

    this.interimTranscriptionTimer = setInterval(
      () => this.ngZone.run(() => void this.runInterimTranscriptionTick()),
      SpeechDefaults.InterimTranscriptionIntervalMs,
    );
  }

  /**
   * Stops interim polling and invalidates in-flight partial responses by bumping
   * the epoch, so a late partial can never overwrite the final transcription.
   */
  private stopInterimTranscription(): void {
    this.interimEpoch++;
    if (this.interimTranscriptionTimer) {
      clearInterval(this.interimTranscriptionTimer);
      this.interimTranscriptionTimer = null;
    }
  }

  private async runInterimTranscriptionTick(): Promise<void> {
    if (this.state() !== ConversationState.Listening) return;
    if (this.interimRequestInFlight) return;

    if (this.audioCapture.getRecordedDurationMs() > SpeechDefaults.InterimTranscriptionMaxAudioMs) {
      this.stopInterimTranscription();
      return;
    }

    const blob = this.audioCapture.peekRecordedBlob();
    if (blob.size < SpeechDefaults.MinBlobBytes) return;

    const epochAtStart = this.interimEpoch;
    const sequence = ++this.interimTickSequence;
    this.interimRequestInFlight = true;
    try {
      const text = await this.dataStt.transcribe(blob, this.locale);
      if (epochAtStart !== this.interimEpoch) return;
      if (sequence <= this.lastAppliedInterimSequence) return;
      if (this.state() !== ConversationState.Listening) return;
      if (!text.trim()) return;

      this.lastAppliedInterimSequence = sequence;
      this.callbacks?.setInputText(text);
      this.callbacks?.detectChanges();
    } catch (err) {
      console.debug('[VS] interim transcription failed (ignored):', err instanceof Error ? err.message : err);
    } finally {
      this.interimRequestInFlight = false;
    }
  }

  private confirmBargeIn(): void {
    this.bargeInCandidateTimer = null;
    if (!this.isBargeInWatching() || !this.audioCapture.isSpeechDetected()) return;

    console.log('[VS] BARGE-IN: sustained speech during playback, interrupting');
    this.bargeInTriggered = true;
    this.interrupt();
  }

  private isBargeInWatching(): boolean {
    return (
      this.voiceModeEnabled() &&
      this.settings.speechSettings().bargeInEnabled &&
      this.audioCapture.isCapturing() &&
      (this.state() === ConversationState.Processing || this.state() === ConversationState.Speaking)
    );
  }

  private clearBargeInCandidateTimer(): void {
    if (this.bargeInCandidateTimer) {
      clearTimeout(this.bargeInCandidateTimer);
      this.bargeInCandidateTimer = null;
    }
  }

  private extractSentences(): string[] {
    const sentences: string[] = [];
    const regex = /[^.!?。！？؟]+[.!?。！？؟]\s*/g;
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
