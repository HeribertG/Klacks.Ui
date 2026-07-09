// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Captures audio from the microphone using Web Audio API, detects voice activity (VAD),
 * and emits PCM audio chunks for streaming to the STT service.
 * @param silenceThresholdMs - Duration of silence before emitting silence-detected event
 * @param audioChunk$ - Observable of PCM audio chunks (ArrayBuffer, Int16 samples)
 * @param vadThresholdMultiplier - Factor applied to the base VAD threshold (raised during barge-in monitoring to reject TTS echo)
 */
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SpeechDefaults } from 'src/app/domain/constants/speech-constants';
import { MicrophoneSelectionService } from 'src/app/domain/services/speech/microphone-selection.service';
import { ExtendedAudioConstraints } from './extended-audio-constraints.interface';

@Injectable({ providedIn: 'root' })
export class AudioCaptureService implements OnDestroy {
  readonly isCapturing = signal(false);
  readonly isSpeechDetected = signal(false);
  readonly silenceThresholdMs = signal(SpeechDefaults.SilenceThresholdMs);

  readonly audioChunk$ = new Subject<ArrayBuffer>();
  readonly silenceDetected$ = new Subject<void>();
  readonly speechStarted$ = new Subject<void>();

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private startPromise: Promise<void> | null = null;
  private workletNode: ScriptProcessorNode | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly vadThreshold = SpeechDefaults.VadThreshold;
  private vadThresholdMultiplier = 1;
  private readonly micSelection = inject(MicrophoneSelectionService);
  private recordedPcm: Int16Array[] = [];
  private debugRmsLogCounter = 0;
  private debugMaxRms = 0;

  setSilenceThresholdMs(ms: number): void {
    this.silenceThresholdMs.set(ms);
  }

  setVadThresholdMultiplier(multiplier: number): void {
    this.vadThresholdMultiplier = multiplier;
  }

  clearRecording(): void {
    this.recordedPcm = [];
  }

  async start(): Promise<void> {
    if (this.isCapturing()) {
      console.log('[VS] audio-capture already capturing, noop');
      return;
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.doStart().finally(() => (this.startPromise = null));
    return this.startPromise;
  }

  private async doStart(): Promise<void> {
    console.log('[VS] audio-capture start, selectedDeviceId=', this.micSelection.selectedDeviceId());
    this.mediaStream = await this.acquireStream(this.micSelection.selectedDeviceId());
    console.log('[VS] stream acquired, tracks=', this.mediaStream.getTracks().map(t => ({ label: t.label, enabled: t.enabled, muted: t.muted })));

    this.audioContext = this.createAudioContextAtTargetRate();
    const actualRate = this.audioContext.sampleRate;
    if (actualRate !== SpeechDefaults.SampleRate) {
      console.warn('[VS] AudioContext rate mismatch: requested', SpeechDefaults.SampleRate, 'Hz but got', actualRate, 'Hz — streaming STT (Deepgram) declares', SpeechDefaults.SampleRate, 'Hz to the provider and will mis-decode; blob STT (Groq) self-corrects via its WAV header.');
    } else {
      console.log('[VS] AudioContext rate =', actualRate, 'Hz (matches the rate declared to streaming STT)');
    }
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.workletNode = this.audioContext.createScriptProcessor(SpeechDefaults.AudioProcessorBufferSize, SpeechDefaults.ChannelCount, SpeechDefaults.ChannelCount);
    this.workletNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const inputData = event.inputBuffer.getChannelData(0);
      this.processAudioChunk(inputData);
    };

    const silentGain = this.audioContext.createGain();
    silentGain.gain.value = 0;
    source.connect(this.workletNode);
    this.workletNode.connect(silentGain);
    silentGain.connect(this.audioContext.destination);

    this.isCapturing.set(true);
    console.log('[VS] audio-capture started, vadThreshold=', this.vadThreshold, 'silenceMs=', this.silenceThresholdMs());
  }

  private createAudioContextAtTargetRate(): AudioContext {
    try {
      return new AudioContext({ sampleRate: SpeechDefaults.SampleRate });
    } catch (err) {
      console.warn('[VS] AudioContext does not support', SpeechDefaults.SampleRate, 'Hz, falling back to default rate:', err instanceof Error ? err.message : err);
      return new AudioContext();
    }
  }

  private async acquireStream(deviceId: string | null): Promise<MediaStream> {
    const baseConstraints: MediaTrackConstraints = {
      sampleRate: SpeechDefaults.SampleRate,
      channelCount: SpeechDefaults.ChannelCount,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      advanced: [{ voiceIsolation: true } as ExtendedAudioConstraints],
    };

    const constraints: MediaTrackConstraints = deviceId
      ? { ...baseConstraints, deviceId: { exact: deviceId } }
      : baseConstraints;

    try {
      return await navigator.mediaDevices.getUserMedia({ audio: constraints });
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        throw err;
      }
      if (err instanceof DOMException && err.name === 'OverconstrainedError' && deviceId) {
        this.micSelection.selectDevice(null);
        return navigator.mediaDevices.getUserMedia({ audio: baseConstraints });
      }
      console.warn('[VS] enhanced audio constraints failed, retrying with minimal constraints:', err instanceof DOMException ? err.name : err, deviceId);
      const minimal: MediaTrackConstraints = deviceId ? { deviceId: { exact: deviceId } } : {};
      return navigator.mediaDevices.getUserMedia({ audio: minimal });
    }
  }

  stop(): void {
    this.clearSilenceTimer();
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
    this.recordedPcm = [];
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
    const effectiveThreshold = this.vadThreshold * this.vadThresholdMultiplier;
    const hasSpeech = rms > effectiveThreshold;

    if (rms > this.debugMaxRms) this.debugMaxRms = rms;
    this.debugRmsLogCounter++;
    if (this.debugRmsLogCounter % 20 === 0) {
      console.log('[VS] VAD tick: rms=', rms.toFixed(5), 'max=', this.debugMaxRms.toFixed(5), 'threshold=', effectiveThreshold, 'speech=', this.isSpeechDetected());
    }

    if (hasSpeech) {
      if (!this.isSpeechDetected()) {
        console.log('[VS] SPEECH STARTED rms=', rms.toFixed(5));
        this.isSpeechDetected.set(true);
        this.speechStarted$.next();
      }
      this.clearSilenceTimer();
      this.resetSilenceTimer();
    }

    if (this.isSpeechDetected()) {
      const int16 = this.float32ToInt16(float32Data);
      this.recordedPcm.push(int16);
      this.audioChunk$.next(int16.buffer as unknown as ArrayBuffer);
    }
  }

  takeRecordedBlob(): Blob {
    const total = this.recordedPcm.reduce((s, a) => s + a.length, 0);
    const merged = new Int16Array(total);
    let offset = 0;
    for (const chunk of this.recordedPcm) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.recordedPcm = [];
    const rate = this.audioContext?.sampleRate ?? SpeechDefaults.SampleRate;
    return this.pcmToWavBlob(merged, rate, SpeechDefaults.ChannelCount);
  }

  private pcmToWavBlob(pcm: Int16Array, sampleRate: number, channels: number): Blob {
    const byteLength = pcm.byteLength;
    const buffer = new ArrayBuffer(44 + byteLength);
    const view = new DataView(buffer);

    this.writeAsciiString(view, 0, 'RIFF');
    view.setUint32(4, 36 + byteLength, true);
    this.writeAsciiString(view, 8, 'WAVE');
    this.writeAsciiString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    this.writeAsciiString(view, 36, 'data');
    view.setUint32(40, byteLength, true);

    const pcmBytes = new Uint8Array(buffer, 44);
    pcmBytes.set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeAsciiString(view: DataView, offset: number, value: string): void {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  private resetSilenceTimer(): void {
    this.silenceTimer = setTimeout(() => {
      console.log('[VS] SILENCE DETECTED (timer fired after', this.silenceThresholdMs(), 'ms)');
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
