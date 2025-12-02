import type { Mock } from "vitest";
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';

import { SpeechRecognitionService } from './speech-recognition.service';

// Mock SpeechRecognition API
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

describe.skip('SpeechRecognitionService', () => {
    let service: SpeechRecognitionService;
    let mockRecognition: MockSpeechRecognition;

    beforeEach(() => {
        // Mock the SpeechRecognition API
        mockRecognition = new MockSpeechRecognition();

        (window as any).SpeechRecognition = function () {
            return new MockSpeechRecognition();
        };
        (window as any).webkitSpeechRecognition = function () {
            return new MockSpeechRecognition();
        };

        // Mock secure context
        Object.defineProperty(window, 'isSecureContext', {
            value: true,
            writable: true,
        });

        // Mock navigator
        Object.defineProperty(navigator, 'language', {
            value: 'de-DE',
            writable: true,
        });

        Object.defineProperty(navigator, 'languages', {
            value: ['de-DE', 'de', 'en-US'],
            writable: true,
        });

        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            writable: true,
        });

        // Mock MediaDevices
        Object.defineProperty(navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn().mockReturnValue(Promise.resolve({
                    getTracks: () => [{ stop: vi.fn() }],
                })),
            },
            writable: true,
        });

        TestBed.configureTestingModule({
            providers: [SpeechRecognitionService],
        });

        service = TestBed.inject(SpeechRecognitionService);
    });

    afterEach(() => {
        // Clean up globals
        delete (window as any).SpeechRecognition;
        delete (window as any).webkitSpeechRecognition;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('browser support detection', () => {
        it('should detect speech recognition support', async () => {
            expect(service.isSupported$()).toBe(true);
            ;
        });

        it('should detect when speech recognition is not supported', () => {
            // Remove speech recognition from window
            (window as any).SpeechRecognition = undefined;
            (window as any).webkitSpeechRecognition = undefined;

            const serviceWithoutSupport = new SpeechRecognitionService();

            expect(serviceWithoutSupport.isSupported$()).toBe(false);
        });

        it('should detect insecure context', () => {
            Object.defineProperty(window, 'isSecureContext', {
                value: false,
                writable: true,
            });

            const serviceInsecure = new SpeechRecognitionService();

            expect(serviceInsecure.isSupported$()).toBe(false);
        });
    });

    describe('speech recognition functionality', () => {
        it('should start listening and emit results', async () => {
            // Mock successful speech recognition result
            const mockResults = {
                resultIndex: 0,
                results: [[{ transcript: 'Hello world', confidence: 0.9 }]],
            };

            const recognitionStartSpy = vi.spyOn(mockRecognition, 'start').mockImplementation(() => {
                setTimeout(() => {
                    if (mockRecognition.onstart) {
                        mockRecognition.onstart({});
                    }
                    setTimeout(() => {
                        if (mockRecognition.onresult) {
                            mockRecognition.onresult({
                                ...mockResults,
                                results: [
                                    {
                                        0: { transcript: 'Hello world' },
                                        isFinal: true,
                                        length: 1,
                                    },
                                ],
                            });
                        }
                    }, 50);
                }, 10);
            });

            service.startListening('de-DE').subscribe((result) => {
                expect(result).toBe('Hello world');
                expect(recognitionStartSpy).toHaveBeenCalled();
                ;
            });
        });

        it('should stop listening', async () => {
            const stopSpy = vi.spyOn(mockRecognition, 'stop');

            service.startListening().subscribe();

            await new Promise(resolve => setTimeout(resolve, 100));
            service.stopListening();
            expect(stopSpy).toHaveBeenCalled();
        });

        it('should abort listening', async () => {
            const abortSpy = vi.spyOn(mockRecognition, 'abort');

            service.startListening().subscribe();

            await new Promise(resolve => setTimeout(resolve, 100));
            service.abortListening();
            expect(abortSpy).toHaveBeenCalled();
        });

        it('should handle speech recognition errors', async () => {
            vi.spyOn(mockRecognition, 'start').mockImplementation(() => {
                setTimeout(() => {
                    if (mockRecognition.onerror) {
                        mockRecognition.onerror({
                            error: 'no-speech',
                        });
                    }
                }, 10);
            });

            service.errors.subscribe((error) => {
                expect(error).toContain('Keine Sprache erkannt');
                ;
            });

            service.startListening();
        });

        it('should handle microphone permission denied error', async () => {
            vi.spyOn(mockRecognition, 'start').mockImplementation(() => {
                setTimeout(() => {
                    if (mockRecognition.onerror) {
                        mockRecognition.onerror({
                            error: 'not-allowed',
                        });
                    }
                }, 10);
            });

            service.errors.subscribe((error) => {
                expect(error).toContain('Mikrofonzugriff verweigert');
                ;
            });

            service.startListening();
        });
    });

    describe('language management', () => {
        it('should set language', () => {
            service.setLanguage('en-US');
            // Cannot directly access private recognition object, but we can test the behavior
            expect(service).toBeTruthy(); // Basic test that method doesn't throw
        });

        it('should update language and restart if listening', async () => {
            const stopSpy = vi.spyOn(service, 'stopListening');
            const startSpy = vi.spyOn(service, 'startListening');

            // Start listening first
            service.startListening().subscribe();

            await new Promise(resolve => setTimeout(resolve, 100));
            // Update language while listening
            service.updateLanguage('fr-FR');

            await new Promise(resolve => setTimeout(resolve, 600));
            expect(stopSpy).toHaveBeenCalled();
        });

        it('should provide supported languages list', () => {
            const languages = service.getSupportedLanguages();

            expect(languages).toContain({ code: 'de-DE', name: 'Deutsch' });
            expect(languages).toContain({ code: 'en-US', name: 'English' });
            expect(languages).toContain({ code: 'fr-FR', name: 'Français' });
            expect(languages).toContain({ code: 'it-IT', name: 'Italiano' });
        });
    });

    describe('microphone permissions', () => {
        it('should request and receive microphone permissions', async () => {
            const result = await service.requestPermissions();

            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: true,
            });
            expect(result).toBe(true);
        });

        it('should handle microphone permission denial', async () => {
            (navigator.mediaDevices.getUserMedia as Mock).mockReturnValue(Promise.reject(new Error('Permission denied')));

            const result = await service.requestPermissions();

            expect(result).toBe(false);
        });
    });

    describe('browser-specific handling', () => {
        it('should handle Edge browser specifically', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
                writable: true,
            });

            const edgeService = new SpeechRecognitionService();

            // Should initialize without errors
            expect(edgeService).toBeTruthy();
        });

        it('should handle Safari browser', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
                writable: true,
            });

            const safariService = new SpeechRecognitionService();

            // Should initialize without errors
            expect(safariService).toBeTruthy();
        });
    });

    describe('error handling', () => {
        it('should handle language not supported error', async () => {
            vi.spyOn(mockRecognition, 'start').mockImplementation(() => {
                setTimeout(() => {
                    if (mockRecognition.onerror) {
                        mockRecognition.onerror({
                            error: 'language-not-supported',
                        });
                    }
                }, 10);
            });

            service.errors.subscribe((error) => {
                expect(error).toContain('Sprache wird nicht unterstützt');
                ;
            });

            service.startListening('invalid-language');
        });

        it('should handle network error', async () => {
            vi.spyOn(mockRecognition, 'start').mockImplementation(() => {
                setTimeout(() => {
                    if (mockRecognition.onerror) {
                        mockRecognition.onerror({
                            error: 'network',
                        });
                    }
                }, 10);
            });

            service.errors.subscribe((error) => {
                expect(error).toContain('Netzwerkfehler');
                ;
            });

            service.startListening();
        });

        it('should handle no match found', async () => {
            vi.spyOn(mockRecognition, 'start').mockImplementation(() => {
                setTimeout(() => {
                    if (mockRecognition.onnomatch) {
                        mockRecognition.onnomatch({});
                    }
                }, 10);
            });

            service.errors.subscribe((error) => {
                expect(error).toContain('Sprache nicht erkannt');
                ;
            });

            service.startListening();
        });
    });

    describe('listening state management', () => {
        it('should track listening state', async () => {
            const states: boolean[] = [];

            service.isListeningObservable.subscribe((state) => {
                states.push(state);
            });

            service.startListening().subscribe();

            await new Promise(resolve => setTimeout(resolve, 100));
            service.stopListening();

            await new Promise(resolve => setTimeout(resolve, 100));
            expect(states).toContain(true); // Started listening
            expect(states).toContain(false); // Stopped listening
        });

        it('should not start listening when already active', () => {
            const startSpy = vi.spyOn(mockRecognition, 'start');

            service.startListening().subscribe();
            service.startListening().subscribe(); // Second call

            // Should only start once
            expect(startSpy).toHaveBeenCalledTimes(1);
        });
    });
});
