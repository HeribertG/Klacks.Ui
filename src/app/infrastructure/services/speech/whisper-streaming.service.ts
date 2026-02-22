// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WhisperStreamingService {
  private pipeline: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;

  private audioChunks: Blob[] = [];
  private accumulatedText = '';
  private silenceTimeout: any = null;
  private isProcessingChunk = false;

  private readonly SILENCE_THRESHOLD = 15;
  private readonly SILENCE_DURATION_MS = 1500;
  private readonly MIN_AUDIO_DURATION_MS = 500;

  public readonly isLoading = signal<boolean>(false);
  public readonly isRecording = signal<boolean>(false);
  public readonly loadProgress = signal<number>(0);
  public readonly isModelLoaded = signal<boolean>(false);
  public readonly isTranscribing = signal<boolean>(false);

  private results$ = new Subject<string>();
  private interimResults$ = new Subject<string>();
  private errors$ = new Subject<string>();
  private currentLanguage = 'de';
  private lastChunkTime = 0;
  private vadCheckInterval: any = null;

  get results(): Observable<string> {
    return this.results$.asObservable();
  }

  get interimResults(): Observable<string> {
    return this.interimResults$.asObservable();
  }

  get errors(): Observable<string> {
    return this.errors$.asObservable();
  }

  async loadModel(): Promise<boolean> {
    if (this.pipeline) {
      return true;
    }

    this.isLoading.set(true);
    this.loadProgress.set(0);

    try {
      const transformers = await import('@huggingface/transformers');
      const pipelineFunc = transformers.pipeline;
      const env = transformers.env;

      env.allowLocalModels = false;
      env.useBrowserCache = true;

      this.pipeline = await pipelineFunc(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny',
        {
          dtype: 'fp32',
          device: 'wasm',
          progress_callback: (progress: any) => {
            if (progress && typeof progress.progress === 'number') {
              this.loadProgress.set(Math.round(progress.progress));
            }
          },
        } as any
      );

      this.isModelLoaded.set(true);
      this.isLoading.set(false);
      this.loadProgress.set(100);
      return true;
    } catch (error: unknown) {
      this.isLoading.set(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Whisper model load error:', error);
      this.errors$.next(`Failed to load Whisper model: ${errorMessage}`);
      return false;
    }
  }

  async startStreaming(language = 'de', deviceId?: string): Promise<void> {
    this.currentLanguage = language;
    this.accumulatedText = '';
    this.audioChunks = [];
    this.lastChunkTime = Date.now();

    if (!this.pipeline) {
      const loaded = await this.loadModel();
      if (!loaded) {
        return;
      }
    }

    try {
      const audioConstraints: MediaTrackConstraints = {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      };

      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecording.set(true);

      this.startVADCheck();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Microphone access error:', error);
      this.errors$.next(`Microphone access error: ${errorMessage}`);
    }
  }

  private startVADCheck(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.vadCheckInterval = setInterval(() => {
      if (!this.analyser || !this.isRecording()) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

      if (average < this.SILENCE_THRESHOLD) {
        if (!this.silenceTimeout) {
          this.silenceTimeout = setTimeout(() => {
            this.processCurrentChunk();
          }, this.SILENCE_DURATION_MS);
        }
      } else {
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
        this.lastChunkTime = Date.now();
      }
    }, 100);
  }

  private async processCurrentChunk(): Promise<void> {
    if (this.isProcessingChunk || this.audioChunks.length === 0) {
      this.silenceTimeout = null;
      return;
    }

    const timeSinceLastChunk = Date.now() - this.lastChunkTime;
    if (timeSinceLastChunk < this.MIN_AUDIO_DURATION_MS) {
      this.silenceTimeout = null;
      return;
    }

    this.isProcessingChunk = true;
    this.isTranscribing.set(true);

    const chunksToProcess = [...this.audioChunks];
    this.audioChunks = [];

    try {
      const audioBlob = new Blob(chunksToProcess, { type: this.getSupportedMimeType() });
      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        const whisperLanguage = this.mapLanguageCode(this.currentLanguage);

        const result = await this.pipeline(audioUrl, {
          language: whisperLanguage,
          task: 'transcribe',
          chunk_length_s: 30,
          stride_length_s: 5,
        });

        if (result && result.text && result.text.trim()) {
          const newText = result.text.trim();
          if (this.accumulatedText) {
            this.accumulatedText += ' ' + newText;
          } else {
            this.accumulatedText = newText;
          }
          this.interimResults$.next(this.accumulatedText);
        }
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error: unknown) {
      const _errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Transcription error:', error, _errorMessage);
    } finally {
      this.isProcessingChunk = false;
      this.isTranscribing.set(false);
      this.silenceTimeout = null;
    }
  }

  async stopStreaming(): Promise<string> {
    if (this.vadCheckInterval) {
      clearInterval(this.vadCheckInterval);
      this.vadCheckInterval = null;
    }

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isRecording.set(false);

    if (this.audioChunks.length > 0 && !this.isProcessingChunk) {
      await this.processCurrentChunk();
    }

    while (this.isProcessingChunk) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalText = this.accumulatedText;
    this.results$.next(finalText);
    this.accumulatedText = '';

    return finalText;
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  private mapLanguageCode(langCode: string): string {
    const languageMap: Record<string, string> = {
      de: 'german',
      'de-DE': 'german',
      'de-CH': 'german',
      'de-AT': 'german',
      en: 'english',
      'en-US': 'english',
      'en-GB': 'english',
      fr: 'french',
      'fr-FR': 'french',
      'fr-CH': 'french',
      it: 'italian',
      'it-IT': 'italian',
      'it-CH': 'italian',
    };
    return languageMap[langCode] || 'german';
  }

  getAccumulatedText(): string {
    return this.accumulatedText;
  }

  dispose(): void {
    this.stopStreaming();
    this.pipeline = null;
    this.isModelLoaded.set(false);
  }
}
