/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';

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
}

@Injectable({
  providedIn: 'root',
})
export class SpeechRecognitionService {
  private recognition: any;
  public isListening = signal<boolean>(false);
  public isSupported$ = signal<boolean>(false);
  private results$ = new Subject<string>();
  private errors$ = new Subject<string>();
  private languageMappingService = inject(LanguageMappingService);
  private diagnostics: SpeechDiagnostics;

  constructor() {
    this.diagnostics = this.collectDiagnostics();
    this.initializeSpeechRecognition();
    if (this.isSupported$()) {
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
    };
  }

  getDiagnostics(): SpeechDiagnostics {
    return { ...this.diagnostics, isSupported: this.isSupported$() };
  }

  private availableLanguages: string[] = [];

  private async detectAvailableLanguages(): Promise<void> {
    // Check if SpeechRecognition is actually available
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.availableLanguages = [];
      return;
    }

    // Test which languages actually work on this system
    const testLanguages = this.languageMappingService.getAllSpeechLocales();
    const workingLanguages: string[] = [];

    for (const lang of testLanguages) {
      try {
        const testRecognition = new SpeechRecognition();
        testRecognition.lang = lang;
        testRecognition.continuous = false;
        testRecognition.interimResults = false;

        // Try to start and immediately abort to test language support
        const isSupported = await new Promise<boolean>((resolve) => {
          testRecognition.onstart = () => {
            testRecognition.abort();
            resolve(true);
          };

          testRecognition.onerror = (event: any) => {
            if (event.error === 'language-not-supported') {
              resolve(false);
            } else {
              resolve(true); // Other errors mean the language is supported but something else went wrong
            }
          };

          setTimeout(() => resolve(false), 2000); // Timeout after 2 seconds

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

    if (!SpeechRecognition) {
      this.isSupported$.set(false);
      this.diagnostics.errorMessage = 'SpeechRecognition API not available in this browser';
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

      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      if (isEdge || this.diagnostics.isArmProcessor) {
        this.recognition.lang = navigator.language || 'de-DE';
      }

      this.isSupported$.set(true);
    } catch (error: any) {
      this.isSupported$.set(false);
      this.diagnostics.errorMessage = `Failed to create SpeechRecognition: ${error?.message || 'Unknown error'}`;
      console.error('SpeechRecognition initialization failed:', error);
      return;
    }

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening.set(true);
    };

    this.recognition.onend = () => {
      this.isListening.set(false);
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Emit final result
      if (finalTranscript) {
        this.results$.next(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening.set(false);

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
        case 'aborted':
          errorMessage = 'Speech recognition was aborted.';
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

  /**
   * Start listening for speech input
   */
  startListening(language?: string): Observable<string> {
    if (!this.isSupported$()) {
      this.errors$.next('Speech recognition is not supported in this browser');
      return this.results$.asObservable();
    }

    if (this.isListening()) {
      return this.results$.asObservable();
    }

    // Simple direct start for Edge - no complex language detection
    const isEdge = /Edg/.test(navigator.userAgent);
    if (isEdge) {
      this.startDirectly(language || navigator.language || 'de');
    } else {
      // Try multiple languages if one fails (for other browsers)
      if (language) {
        this.tryStartWithLanguage(language);
      } else {
        this.tryStartWithLanguage('de-DE'); // Default
      }
    }

    return this.results$.asObservable();
  }

  private startDirectly(language: string): void {
    if (this.recognition) {
      try {
        delete (this.recognition as any).lang;
        this.recognition.start();
      } catch {
        this.recognition.lang = navigator.language;

        try {
          this.recognition.start();
        } catch {
          this.errors$.next(
            `Speech recognition could not be started. Browser: ${navigator.userAgent.substring(
              0,
              50
            )}...`
          );
        }
      }
    }
  }

  private tryStartWithLanguage(primaryLanguage: string): void {
    // Use only languages that we've successfully tested
    if (this.availableLanguages.length === 0) {
      // Fallback to old method if detection not done yet
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

    // Prioritize the requested language if it's available
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

      // Create a temporary error handler
      const originalErrorHandler = this.recognition.onerror;

      this.recognition.onerror = (event: any) => {
        if (event.error === 'language-not-supported') {
          // Try next language
          setTimeout(() => {
            this.tryLanguages(languages, index + 1);
          }, 100);
        } else {
          // Other error, use original handler
          if (originalErrorHandler) {
            originalErrorHandler(event);
          }
        }
      };

      try {
        this.recognition.start();

        // If start succeeds, restore original error handler after a delay
        setTimeout(() => {
          if (this.recognition) {
            this.recognition.onerror = originalErrorHandler;
          }
        }, 1000);
      } catch {
        // Try next language
        setTimeout(() => {
          this.tryLanguages(languages, index + 1);
        }, 100);
      }
    }
  }

  /**
   * Stop listening for speech input
   */
  stopListening(): void {
    if (this.recognition && this.isListening()) {
      this.recognition.stop();
    }
  }

  /**
   * Abort current speech recognition session
   */
  abortListening(): void {
    if (this.recognition && this.isListening()) {
      this.recognition.abort();
    }
  }

  /**
   * Set the language for speech recognition
   */
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
