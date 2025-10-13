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

  constructor() {
    this.initializeSpeechRecognition();
    if (this.isSupported$()) {
      this.detectAvailableLanguages();
    }
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
    // Check for browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      SpeechRecognition: !!window.SpeechRecognition,
      webkitSpeechRecognition: !!window.webkitSpeechRecognition,
      isSecureContext: window.isSecureContext,
      location: window.location.protocol + '//' + window.location.host,
      mediaDevicesSupported: !!navigator.mediaDevices,
      getUserMediaSupported: !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ),
    };

    // Check if this is Safari/WebKit which has different behavior
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isChrome =
      /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);

    if (!SpeechRecognition) {
      this.isSupported$.set(false);
      return;
    }

    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      this.isSupported$.set(false);
      this.errors$.next('Spracherkennung erfordert HTTPS oder localhost');
      return;
    }

    // Windows Edge specific check

    this.isSupported$.set(true);
    this.recognition = new SpeechRecognition();

    // Configuration - DON'T set language here, let it be set dynamically
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    // Edge-specific workaround - set a default language to avoid issues
    if (isEdge) {
      this.recognition.lang = navigator.language || 'de-DE';
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

      let errorMessage = 'Spracherkennungsfehler aufgetreten';
      switch (event.error) {
        case 'no-speech':
          errorMessage =
            'Keine Sprache erkannt. Bitte versuchen Sie es erneut.';
          break;
        case 'audio-capture':
          errorMessage = 'Mikrofon nicht verfügbar oder blockiert.';
          break;
        case 'not-allowed':
          errorMessage =
            'Mikrofonzugriff verweigert. Bitte erlauben Sie den Zugriff.';
          break;
        case 'network':
          errorMessage = 'Netzwerkfehler bei der Spracherkennung.';
          break;
        case 'language-not-supported':
          errorMessage = 'Sprache wird nicht unterstützt.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Spracherkennungsdienst nicht verfügbar.';
          break;
      }

      this.errors$.next(errorMessage);
    };

    this.recognition.onnomatch = () => {
      this.errors$.next('Sprache nicht erkannt. Bitte deutlicher sprechen.');
    };
  }

  /**
   * Start listening for speech input
   */
  startListening(language?: string): Observable<string> {
    if (!this.isSupported$()) {
      this.errors$.next(
        'Spracherkennung wird in diesem Browser nicht unterstützt'
      );
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
            `Spracherkennung konnte nicht gestartet werden. Browser: ${navigator.userAgent.substring(
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
        'Keine unterstützte Sprache gefunden. Bitte überprüfen Sie Ihre Browser-Einstellungen.'
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
