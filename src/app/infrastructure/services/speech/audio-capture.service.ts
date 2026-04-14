// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Captures audio from the microphone using Web Audio API, detects voice activity (VAD),
 * and emits PCM audio chunks for streaming to the STT service.
 * @param silenceThresholdMs - Duration of silence before emitting silence-detected event
 * @param audioChunk$ - Observable of PCM audio chunks (ArrayBuffer, Int16 samples)
 */
import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SpeechDefaults } from 'src/app/domain/constants/speech-constants';

@Injectable()
export class AudioCaptureService implements OnDestroy {
  readonly isCapturing = signal(false);
  readonly isSpeechDetected = signal(false);
  readonly silenceThresholdMs = signal(SpeechDefaults.SilenceThresholdMs);

  readonly audioChunk$ = new Subject<ArrayBuffer>();
  readonly silenceDetected$ = new Subject<void>();
  readonly speechStarted$ = new Subject<void>();

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: ScriptProcessorNode | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly vadThreshold = SpeechDefaults.VadThreshold;

  setSilenceThresholdMs(ms: number): void {
    this.silenceThresholdMs.set(ms);
  }

  async start(): Promise<void> {
    if (this.isCapturing()) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: SpeechDefaults.SampleRate, channelCount: SpeechDefaults.ChannelCount, echoCancellation: true, noiseSuppression: true },
    });

    this.audioContext = new AudioContext({ sampleRate: SpeechDefaults.SampleRate });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.workletNode = this.audioContext.createScriptProcessor(SpeechDefaults.AudioProcessorBufferSize, SpeechDefaults.ChannelCount, SpeechDefaults.ChannelCount);
    this.workletNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const inputData = event.inputBuffer.getChannelData(0);
      this.processAudioChunk(inputData);
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);

    this.isCapturing.set(true);
  }

  stop(): void {
    this.clearSilenceTimer();
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
    this.isCapturing.set(false);
    this.isSpeechDetected.set(false);
  }

  ngOnDestroy(): void {
    this.stop();
    this.audioChunk$.complete();
    this.silenceDetected$.complete();
    this.speechStarted$.complete();
  }

  private processAudioChunk(float32Data: Float32Array): void {
    let sumSquares = 0;
    for (const sample of float32Data) {
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / float32Data.length);
    const hasSpeech = rms > this.vadThreshold;

    if (hasSpeech) {
      if (!this.isSpeechDetected()) {
        this.isSpeechDetected.set(true);
        this.speechStarted$.next();
      }
      this.clearSilenceTimer();
      this.resetSilenceTimer();
    }

    if (this.isSpeechDetected()) {
      const int16 = this.float32ToInt16(float32Data);
      this.audioChunk$.next(int16.buffer as unknown as ArrayBuffer);
    }
  }

  private resetSilenceTimer(): void {
    this.silenceTimer = setTimeout(() => {
      this.isSpeechDetected.set(false);
      this.silenceDetected$.next();
    }, this.silenceThresholdMs());
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  }
}
