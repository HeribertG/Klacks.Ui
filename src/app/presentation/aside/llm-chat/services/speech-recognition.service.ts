import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';

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
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private recognition: any;
  private isListening$ = new BehaviorSubject<boolean>(false);
  private isSupportedSubject$ = new BehaviorSubject<boolean>(false);
  private results$ = new Subject<string>();
  private errors$ = new Subject<string>();

  constructor() {
    this.initializeSpeechRecognition();
    this.detectAvailableLanguages();
  }

  private availableLanguages: string[] = [];

  private async detectAvailableLanguages(): Promise<void> {
    // Test which languages actually work on this system
    const testLanguages = ['de-CH', 'de-DE', 'de', 'en-US', 'en-GB', 'en', 'fr', 'it'];
    const workingLanguages: string[] = [];

    console.log('Testing available speech languages...');
    
    for (const lang of testLanguages) {
      try {
        const testRecognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
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
          console.log(`✓ Language supported: ${lang}`);
        } else {
          console.log(`✗ Language not supported: ${lang}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`✗ Language test failed: ${lang}`, error);
      }
    }
    
    this.availableLanguages = workingLanguages;
    console.log('Available speech languages:', this.availableLanguages);
  }

  private initializeSpeechRecognition(): void {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      SpeechRecognition: !!window.SpeechRecognition,
      webkitSpeechRecognition: !!window.webkitSpeechRecognition,
      isSecureContext: window.isSecureContext,
      location: window.location.protocol + '//' + window.location.host,
      mediaDevicesSupported: !!navigator.mediaDevices,
      getUserMediaSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
    
    console.log('Detailed browser info:', browserInfo);
    
    // Check if this is Safari/WebKit which has different behavior
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
    
    console.log('Browser detection:', { isSafari, isEdge, isChrome });
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      this.isSupportedSubject$.next(false);
      return;
    }

    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.error('Speech recognition requires HTTPS or localhost!');
      this.isSupportedSubject$.next(false);
      this.errors$.next('Spracherkennung erfordert HTTPS oder localhost');
      return;
    }

    // Windows Edge specific check
    if (isEdge && navigator.userAgent.includes('Windows')) {
      console.log('Windows Edge detected - checking speech settings...');
      console.log('Windows version info:', navigator.userAgent);
      
      // Inform user about Windows requirements
      setTimeout(() => {
        console.log('HINWEIS: Für Edge unter Windows müssen folgende Einstellungen aktiviert sein:');
        console.log('1. Windows: Einstellungen → Datenschutz → Spracherkennung → Ein');
        console.log('2. Edge: edge://settings/content/microphone → Erlauben');
        console.log('3. Windows: Sprachpakete installiert (Deutsch)');
      }, 1000);
    }

    this.isSupportedSubject$.next(true);
    this.recognition = new SpeechRecognition();
    
    // Test what languages are available
    console.log('Testing speech recognition initialization...');
    console.log('Default language will be:', navigator.language);
    
    // Configuration - DON'T set language here, let it be set dynamically
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    
    // Edge-specific workaround - set a default language to avoid issues
    if (isEdge) {
      console.log('Edge browser detected - applying workaround');
      this.recognition.lang = navigator.language || 'de-DE';
    }

    // Event handlers
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isListening$.next(true);
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening$.next(false);
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
      console.error('Speech recognition error:', event.error);
      this.isListening$.next(false);
      
      let errorMessage = 'Spracherkennungsfehler aufgetreten';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Keine Sprache erkannt. Bitte versuchen Sie es erneut.';
          break;
        case 'audio-capture':
          errorMessage = 'Mikrofon nicht verfügbar oder blockiert.';
          break;
        case 'not-allowed':
          errorMessage = 'Mikrofonzugriff verweigert. Bitte erlauben Sie den Zugriff.';
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
      console.warn('Speech recognition: no match found');
      this.errors$.next('Sprache nicht erkannt. Bitte deutlicher sprechen.');
    };
  }

  /**
   * Start listening for speech input
   */
  startListening(language?: string): Observable<string> {
    if (!this.isSupportedSubject$.value) {
      this.errors$.next('Spracherkennung wird in diesem Browser nicht unterstützt');
      return this.results$.asObservable();
    }

    if (this.isListening$.value) {
      console.warn('Speech recognition is already active');
      return this.results$.asObservable();
    }

    // Simple direct start for Edge - no complex language detection
    const isEdge = /Edg/.test(navigator.userAgent);
    if (isEdge) {
      console.log('Edge browser - using simple start method');
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
    console.log(`Starting speech recognition directly with language: ${language}`);
    console.log('Current recognition object:', this.recognition);
    console.log('Recognition lang before start:', this.recognition?.lang);
    
    if (this.recognition) {
      // Try without setting language at all - let browser use default
      console.log('Attempting start WITHOUT setting language');
      
      try {
        // Clear any existing language setting
        delete (this.recognition as any).lang;
        this.recognition.start();
        console.log('Started successfully without language setting');
      } catch (error) {
        console.error('Error starting speech recognition (no lang):', error);
        
        // If that fails, try with system language
        console.log('Retrying with system language:', navigator.language);
        this.recognition.lang = navigator.language;
        
        try {
          this.recognition.start();
          console.log('Started successfully with navigator.language');
        } catch (error2) {
          console.error('Error starting speech recognition (with lang):', error2);
          this.errors$.next(`Spracherkennung konnte nicht gestartet werden. Browser: ${navigator.userAgent.substring(0, 50)}...`);
        }
      }
    }
  }

  private tryStartWithLanguage(primaryLanguage: string): void {
    // Use only languages that we've successfully tested
    if (this.availableLanguages.length === 0) {
      console.log('Language detection not complete yet, using fallback method');
      // Fallback to old method if detection not done yet
      const languagesToTry = [primaryLanguage, 'de-CH', 'de-DE', 'de', 'en-US', 'en-GB', 'en'];
      const uniqueLanguages = [...new Set(languagesToTry)];
      this.tryLanguages(uniqueLanguages, 0);
      return;
    }

    // Prioritize the requested language if it's available
    let languagesToTry = [...this.availableLanguages];
    if (this.availableLanguages.includes(primaryLanguage)) {
      languagesToTry = [primaryLanguage, ...this.availableLanguages.filter(l => l !== primaryLanguage)];
    }
    
    console.log(`Using tested available languages: ${languagesToTry.join(', ')}`);
    console.log(`Requested language "${primaryLanguage}" ${this.availableLanguages.includes(primaryLanguage) ? 'IS' : 'is NOT'} available`);
    
    this.tryLanguages(languagesToTry, 0);
  }

  private tryLanguages(languages: string[], index: number): void {
    if (index >= languages.length) {
      this.errors$.next('Keine unterstützte Sprache gefunden. Bitte überprüfen Sie Ihre Browser-Einstellungen.');
      return;
    }

    const currentLang = languages[index];
    console.log(`Trying language ${index + 1}/${languages.length}: "${currentLang}"`);

    if (this.recognition) {
      this.recognition.lang = currentLang;

      // Create a temporary error handler
      const originalErrorHandler = this.recognition.onerror;
      
      this.recognition.onerror = (event: any) => {
        console.warn(`Language "${currentLang}" failed:`, event.error);
        
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
        console.log(`Starting speech recognition with language: "${currentLang}"`);
        this.recognition.start();
        
        // If start succeeds, restore original error handler after a delay
        setTimeout(() => {
          if (this.recognition) {
            this.recognition.onerror = originalErrorHandler;
            console.log(`Successfully started with language: "${currentLang}"`);
          }
        }, 1000);
        
      } catch (error) {
        console.error(`Failed to start with language "${currentLang}":`, error);
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
    if (this.recognition && this.isListening$.value) {
      this.recognition.stop();
    }
  }

  /**
   * Abort current speech recognition session
   */
  abortListening(): void {
    if (this.recognition && this.isListening$.value) {
      this.recognition.abort();
    }
  }

  /**
   * Set the language for speech recognition
   */
  setLanguage(language: string): void {
    if (this.recognition) {
      console.log(`Setting speech recognition language to: ${language}`);
      this.recognition.lang = language;
      
      // Also try common fallbacks for German
      if (language.startsWith('de')) {
        const germanFallbacks = ['de-DE', 'de', 'de-CH', 'de-AT'];
        console.log('German language detected, fallbacks available:', germanFallbacks);
      }
    }
  }

  /**
   * Update language immediately - useful for dynamic language changes
   */
  updateLanguage(language: string): void {
    console.log(`Updating speech recognition language to: ${language}`);
    this.setLanguage(language);
    
    // If currently listening, restart with new language
    if (this.isListening$.value) {
      console.log('Currently listening, restarting with new language...');
      this.stopListening();
      setTimeout(() => {
        this.startListening(language);
      }, 500); // Small delay to ensure proper restart
    }
  }

  /**
   * Check if speech recognition is currently active
   */
  get isListening(): Observable<boolean> {
    return this.isListening$.asObservable();
  }

  /**
   * Check if speech recognition is supported
   */
  get isSupported(): Observable<boolean> {
    return this.isSupportedSubject$.asObservable();
  }

  /**
   * Get the isSupported$ BehaviorSubject directly (for template access)
   */
  get isSupported$(): BehaviorSubject<boolean> {
    return this.isSupportedSubject$;
  }

  /**
   * Get error messages
   */
  get errors(): Observable<string> {
    return this.errors$.asObservable();
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Get available languages (common ones for the Klacks system)
   */
  getSupportedLanguages(): { code: string; name: string }[] {
    return [
      { code: 'de-DE', name: 'Deutsch' },
      { code: 'en-US', name: 'English' },
      { code: 'fr-FR', name: 'Français' },
      { code: 'it-IT', name: 'Italiano' }
    ];
  }
}