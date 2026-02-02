/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ISpeechTranscription } from 'src/app/domain/services/speech/speech-transcription.interface';

@Injectable({
  providedIn: 'root',
})
export class WhisperTranscriptionService implements ISpeechTranscription {
  private pipeline: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;

  public readonly isLoading = signal<boolean>(false);
  public readonly isRecording = signal<boolean>(false);
  public readonly loadProgress = signal<number>(0);
  public readonly isModelLoaded = signal<boolean>(false);

  private results$ = new Subject<string>();
  private errors$ = new Subject<string>();

  get results(): Observable<string> {
    return this.results$.asObservable();
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
      this.errors$.next(`Failed to load Whisper model: ${errorMessage}`);
      return false;
    }
  }

  async startRecording(language: string = 'de'): Promise<Observable<string>> {
    if (!this.pipeline) {
      const loaded = await this.loadModel();
      if (!loaded) {
        return this.results$;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        await this.processAudio(language);
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.errors$.next(`Microphone access error: ${errorMessage}`);
    }

    return this.results$;
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  private async processAudio(language: string): Promise<void> {
    if (this.audioChunks.length === 0 || !this.pipeline) {
      return;
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
      const audioData = await this.convertBlobToFloat32Array(audioBlob);

      const whisperLanguage = this.mapLanguageCode(language);

      const result = await this.pipeline(audioData, {
        language: whisperLanguage,
        task: 'transcribe',
      });

      if (result.text && result.text.trim()) {
        this.results$.next(result.text.trim());
      } else {
        this.errors$.next('No speech detected');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.errors$.next(`Transcription error: ${errorMessage}`);
    }
  }

  private async convertBlobToFloat32Array(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer();

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }

    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    if (audioBuffer.sampleRate !== 16000) {
      return this.resampleAudio(channelData, audioBuffer.sampleRate, 16000);
    }

    return channelData;
  }

  private resampleAudio(
    audioData: Float32Array,
    fromSampleRate: number,
    toSampleRate: number
  ): Float32Array {
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const t = srcIndex - srcIndexFloor;
      result[i] = audioData[srcIndexFloor] * (1 - t) + audioData[srcIndexCeil] * t;
    }

    return result;
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
      es: 'spanish',
      'es-ES': 'spanish',
      pt: 'portuguese',
      'pt-PT': 'portuguese',
      'pt-BR': 'portuguese',
      nl: 'dutch',
      'nl-NL': 'dutch',
      pl: 'polish',
      'pl-PL': 'polish',
      ru: 'russian',
      'ru-RU': 'russian',
      ja: 'japanese',
      'ja-JP': 'japanese',
      zh: 'chinese',
      'zh-CN': 'chinese',
      ko: 'korean',
      'ko-KR': 'korean',
    };

    return languageMap[langCode] || 'german';
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.pipeline = null;
    this.isModelLoaded.set(false);
  }
}
