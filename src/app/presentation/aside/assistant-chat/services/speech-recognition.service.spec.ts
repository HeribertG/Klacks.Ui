 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';

import { SpeechRecognitionService } from './speech-recognition.service';
import { WhisperStreamingService } from 'src/app/infrastructure/services/speech/whisper-streaming.service';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';

class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    lang = 'en-US';

    onstart: ((event: any) => void) | null = null;
    onend: ((event: any) => void) | null = null;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onnomatch: ((event: any) => void) | null = null;

    start() {
        setTimeout(() => {
            if (this.onstart) {
                this.onstart({});
            }
        }, 10);
    }

    stop() {
        setTimeout(() => {
            if (this.onend) {
                this.onend({});
            }
        }, 10);
    }

    abort() {
        setTimeout(() => {
            if (this.onend) {
                this.onend({});
            }
        }, 10);
    }
}

describe('SpeechRecognitionService', () => {
    let service: SpeechRecognitionService;
    let mockWhisperService: any;
    let mockLanguageMappingService: any;
    let resultsSubject: Subject<string>;
    let interimResultsSubject: Subject<string>;
    let errorsSubject: Subject<string>;

    beforeEach(() => {
        // Arrange
        resultsSubject = new Subject<string>();
        interimResultsSubject = new Subject<string>();
        errorsSubject = new Subject<string>();

        mockWhisperService = {
            isLoading: signal(false),
            isRecording: signal(false),
            loadProgress: signal(0),
            isModelLoaded: signal(false),
            isTranscribing: signal(false),
            results: resultsSubject.asObservable(),
            interimResults: interimResultsSubject.asObservable(),
            errors: errorsSubject.asObservable(),
            loadModel: vi.fn().mockResolvedValue(true),
            startStreaming: vi.fn().mockResolvedValue(undefined),
            stopStreaming: vi.fn().mockResolvedValue(''),
            dispose: vi.fn(),
        };

        mockLanguageMappingService = {
            getAllSpeechLocales: vi.fn().mockReturnValue(['de-DE', 'en-US', 'fr-FR', 'it-IT']),
            getAvailableLanguages: vi.fn().mockReturnValue([
                { speechLocale: 'de-DE', displayName: 'Deutsch' },
                { speechLocale: 'en-US', displayName: 'English' },
                { speechLocale: 'fr-FR', displayName: 'Français' },
                { speechLocale: 'it-IT', displayName: 'Italiano' },
            ]),
        };

        (window as any).SpeechRecognition = function () {
            return new MockSpeechRecognition();
        };
        (window as any).webkitSpeechRecognition = function () {
            return new MockSpeechRecognition();
        };

        Object.defineProperty(window, 'isSecureContext', {
            value: true,
            writable: true,
            configurable: true,
        });

        Object.defineProperty(navigator, 'language', {
            value: 'de-DE',
            writable: true,
            configurable: true,
        });

        Object.defineProperty(navigator, 'languages', {
            value: ['de-DE', 'de', 'en-US'],
            writable: true,
            configurable: true,
        });

        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            writable: true,
            configurable: true,
        });

        Object.defineProperty(navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn().mockReturnValue(Promise.resolve({
                    getTracks: () => [{ stop: vi.fn() }],
                })),
            },
            writable: true,
            configurable: true,
        });

        TestBed.configureTestingModule({
            providers: [
                SpeechRecognitionService,
                { provide: WhisperStreamingService, useValue: mockWhisperService },
                { provide: LanguageMappingService, useValue: mockLanguageMappingService },
            ],
        });

        service = TestBed.inject(SpeechRecognitionService);
    });

    afterEach(() => {
        // Clean up globals
        delete (window as any).SpeechRecognition;
        delete (window as any).webkitSpeechRecognition;
    });

    it('should be created', () => {
        // Assert
        expect(service).toBeTruthy();
    });

    describe('browser support detection', () => {
        it('should detect speech recognition support', () => {
            // Assert
            expect(service.isSupported$()).toBe(true);
        });

        it('should return diagnostics', () => {
            // Act
            const diagnostics = service.getDiagnostics();

            // Assert
            expect(diagnostics).toBeDefined();
            expect(diagnostics.browserName).toBe('Chrome');
        });
    });

    describe('language management', () => {
        it('should set language without throwing', () => {
            // Act & Assert
            expect(() => service.setLanguage('en-US')).not.toThrow();
        });

        it('should update language without throwing', () => {
            // Act & Assert
            expect(() => service.updateLanguage('fr-FR')).not.toThrow();
        });

        it('should provide supported languages list', () => {
            // Act
            const languages = service.getSupportedLanguages();

            // Assert
            expect(languages).toEqual([
                { code: 'de-DE', name: 'Deutsch' },
                { code: 'en-US', name: 'English' },
                { code: 'fr-FR', name: 'Français' },
                { code: 'it-IT', name: 'Italiano' },
            ]);
        });
    });

    describe('microphone permissions', () => {
        it('should request and receive microphone permissions', async () => {
            // Act
            const result = await service.requestPermissions();

            // Assert
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: true,
            });
            expect(result).toBe(true);
        });

        it('should handle microphone permission denial', async () => {
            // Arrange
            (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(new Error('Permission denied'));

            // Act
            const result = await service.requestPermissions();

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('listening state', () => {
        it('should expose isListening signal', () => {
            // Assert
            expect(service.isListening()).toBe(false);
        });

        it('should expose errors observable', () => {
            // Assert
            expect(service.errors).toBeDefined();
        });

        it('should expose interimResults observable', () => {
            // Assert
            expect(service.interimResults).toBeDefined();
        });
    });

    describe('Whisper integration', () => {
        it('should expose isWhisperLoading signal', () => {
            // Assert
            expect(service.isWhisperLoading()).toBe(false);
        });

        it('should expose whisperLoadProgress signal', () => {
            // Assert
            expect(service.whisperLoadProgress()).toBe(0);
        });

        it('should expose isWhisperModelLoaded signal', () => {
            // Assert
            expect(service.isWhisperModelLoaded()).toBe(false);
        });

        it('should expose isTranscribing signal', () => {
            // Assert
            expect(service.isTranscribing()).toBe(false);
        });
    });

    describe('startListening', () => {
        it('should return observable', () => {
            // Act
            const result = service.startListening('de-DE');

            // Assert
            expect(result).toBeDefined();
            expect(result.subscribe).toBeDefined();
        });
    });

    describe('stopListening', () => {
        it('should not throw when not listening', () => {
            // Act & Assert
            expect(() => service.stopListening()).not.toThrow();
        });
    });

    describe('abortListening', () => {
        it('should not throw when not listening', () => {
            // Act & Assert
            expect(() => service.abortListening()).not.toThrow();
        });
    });
});
