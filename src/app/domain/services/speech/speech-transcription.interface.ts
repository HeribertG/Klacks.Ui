import { Signal } from '@angular/core';
import { Observable } from 'rxjs';

export interface ISpeechTranscription {
  readonly isLoading: Signal<boolean>;
  readonly isRecording: Signal<boolean>;
  readonly loadProgress: Signal<number>;
  readonly isModelLoaded: Signal<boolean>;
  readonly results: Observable<string>;
  readonly errors: Observable<string>;

  loadModel(): Promise<boolean>;
  startRecording(language: string): Promise<Observable<string>>;
  stopRecording(): void;
  dispose(): void;
}

export const SPEECH_TRANSCRIPTION_TOKEN = 'SPEECH_TRANSCRIPTION_TOKEN';
