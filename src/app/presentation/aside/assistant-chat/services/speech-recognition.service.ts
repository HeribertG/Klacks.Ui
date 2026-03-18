// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { WhisperStreamingService } from 'src/app/infrastructure/services/speech/whisper-streaming.service';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechDiagnostics {
  isSupported: boolean;
  isSecureContext: boolean;
  browserName: string;
  isArmProcessor: boolean;
  speechRecognitionAvailable: boolean;
  webkitSpeechRecognitionAvailable: boolean;
  mediaDevicesAvailable: boolean;
  errorMessage?: string;
  useWhisperFallback: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SpeechRecognitionService {
  private recognition: any;
  public isListening = signal<boolean>(false);
  public isSupported$ = signal<boolean>(false);
  private results$ = new Subject<string>();
  private interimResults$ = new Subject<string>();
  private errors$ = new Subject<string>();
  private languageMappingService = inject(LanguageMappingService);
  private whisperStreamingService = inject(WhisperStreamingService);
  private diagnostics: SpeechDiagnostics;
  private useWhisperFallback = false;
  private whisperSubscription: Subscription | null = null;
  private whisperInterimSubscription: Subscription | null = null;
  private whisperErrorSubscription: Subscription | null = null;

  private accumulatedTranscript = '';
  private shouldContinue = false;

  public isWhisperLoading = this.whisperStreamingService.isLoading;
  public whisperLoadProgress = this.whisperStreamingService.loadProgress;
  public isWhisperModelLoaded = this.whisperStreamingService.isModelLoaded;
  public isTranscribing = this.whisperStreamingService.isTranscribing;

  constructor() {
    this.diagnostics = this.collectDiagnostics();
    this.initializeSpeechRecognition();

    if (this.useWhisperFallback) {
      this.isSupported$.set(true);
      this.diagnostics.useWhisperFallback = true;
    } else if (this.isSupported$()) {
      this.detectAvailableLanguages();
    }
  }

  private collectDiagnostics(): SpeechDiagnostics {
    const userAgent = navigator.userAgent.toLowerCase();
    const isArm = /arm|aarch64|snapdragon/i.test(navigator.userAgent) ||
                  (navigator as any).userAgentData?.platform === 'Windows' &&
                  /arm/i.test((navigator as any).userAgentData?.architecture || '');

    let browserName = 'Unknown';
    if (/edg/i.test(userAgent)) browserName = 'Edge';
    else if (/chrome/i.test(userAgent)) browserName = 'Chrome';
    else if (/safari/i.test(userAgent)) browserName = 'Safari';
    else if (/firefox/i.test(userAgent)) browserName = 'Firefox';

    return {
      isSupported: false,
      isSecureContext: window.isSecureContext,
      browserName,
      isArmProcessor: isArm,
      speechRecognitionAvailable: !!window.SpeechRecognition,
      webkitSpeechRecognitionAvailable: !!window.webkitSpeechRecognition,
      mediaDevicesAvailable: !!navigator.mediaDevices?.getUserMedia,
      useWhisperFallback: false,
    };
  }

  getDiagnostics(): SpeechDiagnostics {
    return { ...this.diagnostics, isSupported: this.isSupported$() };
  }

  private availableLanguages: string[] = [];

  private async detectAvailableLanguages(): Promise<void> {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.availableLanguages = [];
      return;
    }

    const testLanguages = this.languageMappingService.getAllSpeechLocales();
    const workingLanguages: string[] = [];

    for (const lang of testLanguages) {
      try {
        const testRecognition = new SpeechRecognition();
        testRecognition.lang = lang;
        testRecognition.continuous = false;
        testRecognition.interimResults = false;

        const isSupported = await new Promise<boolean>((resolve) => {
          testRecognition.onstart = () => {
            testRecognition.abort();
            resolve(true);
          };

          testRecognition.onerror = (event: any) => {
            if (event.error === 'language-not-supported') {
              resolve(false);
            } else {
              resolve(true);
            }
          };

          setTimeout(() => resolve(false), 2000);

          try {
            testRecognition.start();
          } catch (error) {
            resolve(false);
          }
        });

        if (isSupported) {
          workingLanguages.push(lang);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch {}
    }

    this.availableLanguages = workingLanguages;
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    if (isEdge || isFirefox || !SpeechRecognition) {
      this.useWhisperFallback = true;
      this.diagnostics.useWhisperFallback = true;

      if (!window.isSecureContext) {
        this.isSupported$.set(false);
        this.diagnostics.errorMessage = 'Speech recognition requires HTTPS or localhost';
        this.errors$.next('Speech recognition requires HTTPS or localhost');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        this.isSupported$.set(false);
        this.diagnostics.errorMessage = 'Microphone access not available';
        return;
      }

      this.isSupported$.set(true);
      return;
    }

    if (!window.isSecureContext) {
      this.isSupported$.set(false);
      this.diagnostics.errorMessage = 'Speech recognition requires HTTPS or localhost';
      this.errors$.next('Speech recognition requires HTTPS or localhost');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      if (this.diagnostics.isArmProcessor) {
        this.recognition.lang = navigator.language || 'de-DE';
      }

      this.isSupported$.set(true);
    } catch (error: any) {
      this.useWhisperFallback = true;
      this.diagnostics.useWhisperFallback = true;
      this.isSupported$.set(true);
      return;
    }

    this.recognition.onstart = () => {
      this.isListening.set(true);
    };

    this.recognition.onend = () => {
      if (this.shouldContinue && this.isListening()) {
        try {
          this.recognition.start();
        } catch (e) {
          this.isListening.set(false);
          this.shouldContinue = false;
        }
      } else {
        this.isListening.set(false);
      }
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        if (this.accumulatedTranscript) {
          this.accumulatedTranscript += ' ' + finalTranscript.trim();
        } else {
          this.accumulatedTranscript = finalTranscript.trim();
        }
        this.interimResults$.next(this.accumulatedTranscript);
      } else if (interimTranscript) {
        const displayText = this.accumulatedTranscript
          ? this.accumulatedTranscript + ' ' + interimTranscript
          : interimTranscript;
        this.interimResults$.next(displayText);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' && this.shouldContinue) {
        return;
      }

      if (event.error === 'aborted') {
        return;
      }

      this.isListening.set(false);
      this.shouldContinue = false;

      let errorMessage = 'Speech recognition error occurred';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not available or blocked.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow access.';
          break;
        case 'network':
          errorMessage = 'Network error during speech recognition.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported.';
          break;
        case 'service-not-allowed':
          errorMessage = this.diagnostics.isArmProcessor
            ? 'Speech recognition service not available. Windows on ARM may not support all speech recognition features. Please check Windows speech settings.'
            : 'Speech recognition service not available.';
          break;
        default:
          if (this.diagnostics.isArmProcessor) {
            errorMessage = `Speech recognition error (${event.error}). Windows on ARM may have limited speech recognition support.`;
          }
      }

      console.warn('Speech recognition error:', {
        error: event.error,
        message: event.message,
        diagnostics: this.diagnostics
      });

      this.errors$.next(errorMessage);
    };

    this.recognition.onnomatch = () => {
      this.errors$.next('Speech not recognized. Please speak more clearly.');
    };
  }

  startListening(language?: string, deviceId?: string): Observable<string> {
    if (!this.isSupported$()) {
      this.errors$.next('Speech recognition is not supported in this browser');
      return this.results$.asObservable();
    }

    if (this.isListening()) {
      return this.results$.asObservable();
    }

    this.accumulatedTranscript = '';

    if (this.useWhisperFallback) {
      this.startWhisperStreaming(language || 'de', deviceId);
      return this.results$.asObservable();
    }

    this.shouldContinue = true;

    if (language) {
      this.tryStartWithLanguage(language);
    } else {
      this.tryStartWithLanguage('de-DE');
    }

    return this.results$.asObservable();
  }

  private async startWhisperStreaming(language: string, deviceId?: string): Promise<void> {
    this.isListening.set(true);

    this.whisperSubscription?.unsubscribe();
    this.whisperInterimSubscription?.unsubscribe();
    this.whisperErrorSubscription?.unsubscribe();

    this.whisperInterimSubscription = this.whisperStreamingService.interimResults.subscribe((text: string) => {
      this.interimResults$.next(text);
    });

    this.whisperSubscription = this.whisperStreamingService.results.subscribe((text: string) => {
      this.results$.next(text);
    });

    this.whisperErrorSubscription = this.whisperStreamingService.errors.subscribe((error: string) => {
      this.errors$.next(error);
      this.isListening.set(false);
    });

    await this.whisperStreamingService.startStreaming(language, deviceId);
  }

  private tryStartWithLanguage(primaryLanguage: string): void {
    if (this.availableLanguages.length === 0) {
      const languagesToTry = [
        primaryLanguage,
        'de-CH',
        'de-DE',
        'de',
        'en-US',
        'en-GB',
        'en',
      ];
      const uniqueLanguages = [...new Set(languagesToTry)];
      this.tryLanguages(uniqueLanguages, 0);
      return;
    }

    let languagesToTry = [...this.availableLanguages];
    if (this.availableLanguages.includes(primaryLanguage)) {
      languagesToTry = [
        primaryLanguage,
        ...this.availableLanguages.filter((l) => l !== primaryLanguage),
      ];
    }

    this.tryLanguages(languagesToTry, 0);
  }

  private tryLanguages(languages: string[], index: number): void {
    if (index >= languages.length) {
      this.errors$.next(
        'No supported language found. Please check your browser settings.'
      );
      return;
    }

    const currentLang = languages[index];

    if (this.recognition) {
      this.recognition.lang = currentLang;
      const originalErrorHandler = this.recognition.onerror;

      this.recognition.onerror = (event: any) => {
        if (event.error === 'language-not-supported') {
          setTimeout(() => {
            this.tryLanguages(languages, index + 1);
          }, 100);
        } else {
          if (originalErrorHandler) {
            originalErrorHandler(event);
          }
        }
      };

      try {
        this.recognition.start();
        setTimeout(() => {
          if (this.recognition) {
            this.recognition.onerror = originalErrorHandler;
          }
        }, 1000);
      } catch {
        setTimeout(() => {
          this.tryLanguages(languages, index + 1);
        }, 100);
      }
    }
  }

  stopListening(): void {
    this.shouldContinue = false;

    if (this.useWhisperFallback) {
      this.whisperStreamingService.stopStreaming().then((finalText) => {
        if (finalText) {
          this.results$.next(finalText);
        }
        this.isListening.set(false);
      });
      return;
    }

    if (this.recognition && this.isListening()) {
      this.recognition.stop();
      if (this.accumulatedTranscript) {
        this.results$.next(this.accumulatedTranscript);
      }
    }
  }

  abortListening(): void {
    this.shouldContinue = false;
    this.accumulatedTranscript = '';

    if (this.useWhisperFallback) {
      this.whisperStreamingService.stopStreaming();
      this.isListening.set(false);
      return;
    }

    if (this.recognition && this.isListening()) {
      this.recognition.abort();
    }
  }

  setLanguage(language: string): void {
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  updateLanguage(language: string): void {
    this.setLanguage(language);

    if (this.isListening()) {
      this.stopListening();
      setTimeout(() => {
        this.startListening(language);
      }, 500);
    }
  }

  get isListeningObservable(): Observable<boolean> {
    return toObservable(this.isListening);
  }

  get isSupported(): boolean {
    return this.isSupported$();
  }

  get errors(): Observable<string> {
    return this.errors$.asObservable();
  }

  get interimResults(): Observable<string> {
    return this.interimResults$.asObservable();
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  getSupportedLanguages(): { code: string; name: string }[] {
    return this.languageMappingService.getAvailableLanguages().map(config => ({
      code: config.speechLocale,
      name: config.displayName
    }));
  }
}
