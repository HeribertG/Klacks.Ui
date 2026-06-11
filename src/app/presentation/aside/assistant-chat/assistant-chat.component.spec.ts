// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, Pipe, PipeTransform, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AssistantChatComponent } from './assistant-chat.component';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { ChatFunctionExecutionService } from './services/chat-function-execution.service';
import { ConversationOrchestratorService, ConversationState } from './services/conversation-orchestrator.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { IconChatComponent } from 'src/app/presentation/icons/icon-chat.component';
import { IconMMLComponent } from 'src/app/presentation/icons/icon-mml.component';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { IAssistantProvider } from 'src/app/infrastructure/api/assistant/data-assistant-provider.service';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { SEARCH_STRATEGY } from 'src/app/domain/interfaces/search-strategy.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ONBOARDING_STATIONS } from 'src/app/domain/constants/onboarding-stations';

@Pipe({ name: 'translate' })
class MockTranslatePipe implements PipeTransform {
    transform(value: string): string {
        return value;
    }
}

describe('AssistantChatComponent', () => {
    let component: AssistantChatComponent;
    let fixture: ComponentFixture<AssistantChatComponent>;
    let mockLlmService: any;
    let mockLlmProviderService: any;
    let mockSpeechService: any;
    let mockTranslateService: TranslateService;
    let mockRouter: any;
    let mockFunctionExecutionService: any;
    let mockLanguageMappingService: any;

    const mockModels: IAssistantModel[] = [
        {
            id: '1',
            modelId: 'gpt-4',
            modelName: 'GPT-4',
            isEnabled: true,
            isDefault: true,
            costPerInputToken: 0.01,
            costPerOutputToken: 0.03,
            maxTokens: 8000,
            contextWindow: 32000,
            providerId: 'openai',
            capabilities: ['text', 'function-calling'],
        },
        {
            id: '2',
            modelId: 'gpt-3.5',
            modelName: 'GPT-3.5',
            isEnabled: false,
            isDefault: false,
            costPerInputToken: 0.001,
            costPerOutputToken: 0.002,
            maxTokens: 4000,
            contextWindow: 16000,
            providerId: 'openai',
            capabilities: ['text'],
        },
    ];

    const mockProviders: IAssistantProvider[] = [
        {
            id: '1',
            providerId: 'openai',
            providerName: 'OpenAI',
            isEnabled: true,
            hasApiKey: true,
            baseUrl: 'https://api.openai.com/v1',
            priority: 1,
        },
        {
            id: '2',
            providerId: 'anthropic',
            providerName: 'Anthropic',
            isEnabled: true,
            hasApiKey: false,
            baseUrl: 'https://api.anthropic.com',
            priority: 2,
        },
    ];

    beforeEach(async () => {
        const llmServiceSpy = {
            getAvailableModels: vi.fn(),
            getCurrentModelId: vi.fn(),
            sendMessage: vi.fn(),
            sendMessageStream: vi.fn().mockReturnValue(new AbortController()),
            setCurrentModel: vi.fn(),
            getModelInfo: vi.fn(),
            setLanguage: vi.fn(),
            clearConversation: vi.fn(),
            warmupCache: vi.fn(),
            modelsInitialized: signal(true),
            selectedModelId: signal('gpt-4'),
        };

        const llmProviderServiceSpy = {
            loadProviders: vi.fn(),
            getCurrentProviders: vi.fn(),
            providersInitialized: signal(true),
        };

        const speechServiceSpy = {
            startListening: vi.fn(),
            stopListening: vi.fn(),
            requestPermissions: vi.fn(),
            updateLanguage: vi.fn(),
            setLanguage: vi.fn(),
            getDiagnostics: vi.fn(),
            isSupported$: vi.fn().mockReturnValue(true),
            errors: new BehaviorSubject(''),
            interimResults: new BehaviorSubject(''),
            isWhisperLoading: vi.fn().mockReturnValue(false),
            whisperLoadProgress: vi.fn().mockReturnValue(0),
            isWhisperModelLoaded: vi.fn().mockReturnValue(false),
            isTranscribing: vi.fn().mockReturnValue(false),
        };
        speechServiceSpy.getDiagnostics.mockReturnValue({
            isSupported: true,
            permissionStatus: 'granted',
            browserInfo: 'Chrome Headless',
            error: null,
            useWhisperFallback: false,
        });

        const routerSpy = {
            navigate: vi.fn(),
            navigateByUrl: vi.fn().mockResolvedValue(true)
        };

        const functionExecutionServiceSpy = {
            executeFunction: vi.fn()
        };
        functionExecutionServiceSpy.executeFunction.mockReturnValue(of({ id: '1', success: true }));

        const languageMappingServiceSpy = {
            getCurrentLanguageConfig: vi.fn(),
            getSpeechLocale: vi.fn(),
            getLanguageConfig: vi.fn()
        };
        languageMappingServiceSpy.getCurrentLanguageConfig.mockReturnValue({
            code: 'de',
            name: 'German',
            speechLocale: 'de-CH',
            displayName: 'Deutsch'
        });
        languageMappingServiceSpy.getSpeechLocale.mockReturnValue('de-CH');
        languageMappingServiceSpy.getLanguageConfig.mockReturnValue({
            code: 'de',
            name: 'German',
            speechLocale: 'de-CH',
            displayName: 'Deutsch'
        });

        await TestBed.configureTestingModule({
            imports: [
                AssistantChatComponent,
                FontAwesomeModule,
                FormsModule,
                TranslateModule.forRoot(),
            ],
            providers: [
                { provide: DataManagementAssistantService, useValue: llmServiceSpy },
                { provide: DataManagementAssistantProviderService, useValue: llmProviderServiceSpy },
                { provide: SpeechRecognitionService, useValue: speechServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: AssistantFunctionExecutionService, useValue: functionExecutionServiceSpy },
                { provide: LanguageMappingService, useValue: languageMappingServiceSpy },
                { provide: SEARCH_STRATEGY, useValue: { globalSearch: vi.fn(), resetFilter: vi.fn(), restoreSearch: vi.fn(), setRestoreSearch: vi.fn() } },
                { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn(), on: () => of(), onAny: () => of() } },
            ],
        })
            .overrideComponent(AssistantChatComponent, {
            set: {
                schemas: [CUSTOM_ELEMENTS_SCHEMA],
                imports: [
                    CommonModule,
                    FontAwesomeModule,
                    FormsModule,
                    MockTranslatePipe,
                    IconChatComponent,
                    IconMMLComponent,
                ],
                providers: [
                    { provide: ChatFunctionExecutionService, useValue: { executeFunctionCalls: vi.fn().mockResolvedValue(undefined) } },
                    {
                        provide: ConversationOrchestratorService,
                        useFactory: () => {
                            const messagesSig = signal<readonly any[]>([]);
                            return {
                                state: signal(ConversationState.Idle),
                                voiceModeEnabled: signal(false),
                                interimText: signal(''),
                                messages: messagesSig.asReadonly(),
                                addMessage: vi.fn((msg: any) => messagesSig.update((c) => [...c, msg])),
                                replaceMessages: vi.fn((next: readonly any[]) => messagesSig.set([...next])),
                                updateMessage: vi.fn((id: string, patch: any) =>
                                    messagesSig.update((current) => {
                                        const idx = current.findIndex((m: any) => m.id === id);
                                        if (idx < 0) return current;
                                        const out = current.slice();
                                        out[idx] = { ...out[idx], ...patch };
                                        return out;
                                    }),
                                ),
                                clearMessages: vi.fn(() => messagesSig.set([])),
                                initialize: vi.fn(),
                                toggleVoiceMode: vi.fn().mockResolvedValue(undefined),
                                interrupt: vi.fn(),
                                onStreamContent: vi.fn(),
                                onStreamDone: vi.fn(),
                                onStreamError: vi.fn(),
                            };
                        },
                    },
                ],
            },
        })
            .compileComponents();

        mockLlmService = TestBed.inject(DataManagementAssistantService) as any;
        mockLlmProviderService = TestBed.inject(DataManagementAssistantProviderService) as any;
        mockSpeechService = TestBed.inject(SpeechRecognitionService) as any;
        mockRouter = TestBed.inject(Router) as any;
        mockFunctionExecutionService = TestBed.inject(AssistantFunctionExecutionService) as any;
        mockLanguageMappingService = TestBed.inject(LanguageMappingService) as any;

        const translateService = TestBed.inject(TranslateService);
        vi.spyOn(translateService, 'instant').mockImplementation((key: string | string[]) => {
            const k = Array.isArray(key) ? key[0] : key;
            if (k === 'assistant-chat.welcome.content') {
                return '👋 Hallo! Ich bin Ihr Assistent. Ich kann Ihnen helfen:\n\n• Mitarbeiter zu erstellen\n• Nach Personen zu suchen\n• Verträge zu verwalten\n\nSie können mit mir sprechen oder tippen. Versuchen Sie: "Erstelle Mitarbeiter Max Muster"';
            }
            if (k.startsWith('assistant-chat.welcome.suggestion-')) {
                return 'Test suggestion';
            }
            return 'Error message';
        });
        mockTranslateService = translateService as any;

        mockLlmService.getAvailableModels.mockReturnValue(of(mockModels));
        mockLlmService.getCurrentModelId.mockReturnValue(of('gpt-4'));
        mockLlmService.setLanguage.mockImplementation(() => {
        });
        mockLlmService.getModelInfo.mockReturnValue(mockModels[0]);

        mockLlmProviderService.loadProviders.mockReturnValue(Promise.resolve(mockProviders));
        mockLlmProviderService.getCurrentProviders.mockReturnValue(mockProviders);

        fixture = TestBed.createComponent(AssistantChatComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        // Don't call detectChanges here to avoid ngOnInit issues
        expect(component).toBeTruthy();
    });

    it('should initialize with welcome message on ngOnInit', () => {
        // Act
        fixture.detectChanges();

        // Assert
        expect(component.messages.length).toBeGreaterThan(0);
        expect(component.messages[0].sender).toBe('assistant');
        expect(component.messages[0].content).toContain('👋');
    });

    it('should load available models on init', async () => {
        // Act
        fixture.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert
        expect(mockLlmService.getAvailableModels).toHaveBeenCalled();
        expect(component.availableModels.length).toBe(1);
        expect(component.availableModels[0].modelId).toBe('gpt-4');
    });

    it('should set current model on init', async () => {
        // Act
        fixture.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert
        expect(mockLlmService.getCurrentModelId).toHaveBeenCalled();
        expect(component.currentModel).toBe('gpt-4');
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should not send empty message', async () => {
            // Arrange
            component.inputText = '   ';

            // Act
            await component.sendMessage();

            // Assert
            expect(mockLlmService.sendMessage).not.toHaveBeenCalled();
        });

        it('should send message and handle response', async () => {
            // Arrange
            component.inputText = 'Hello';
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onStreamStart(component.conversationId);
                    callbacks.onContent('Hi there!');
                    callbacks.onMetadata({ suggestions: ['How can I help?'] });
                    callbacks.onDone();
                    return new AbortController();
                },
            );

            // Act
            await component.sendMessage();

            // Assert
            expect(mockLlmService.sendMessageStream).toHaveBeenCalled();
            expect(component.messages.length).toBe(3); // Welcome + User + Assistant
            expect(component.messages[1].content).toBe('Hello');
            expect(component.messages[1].sender).toBe('user');
            expect(component.messages[2].content).toBe('Hi there!');
            expect(component.messages[2].sender).toBe('assistant');
            expect(component.inputText).toBe('');
        });

        it('should handle error in sendMessage', async () => {
            // Arrange
            component.inputText = 'Hello';
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onError('API Error');
                    return new AbortController();
                },
            );

            // Act
            await component.sendMessage();

            // Assert
            expect(component.messages.length).toBe(3); // Welcome + User + Error
            expect(component.messages[2].content).toContain('API Error');
            expect(component.isProcessing).toBe(false);
        });

        it('should navigate when actionPerformed is true', async () => {
            // Arrange
            vi.useFakeTimers();
            component.inputText = 'Navigate to clients';
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onContent('Navigating to clients');
                    callbacks.onMetadata({ navigateTo: '/workplace/clients', actionPerformed: true });
                    callbacks.onDone();
                    return new AbortController();
                },
            );

            // Act
            component.sendMessage();
            await vi.advanceTimersByTimeAsync(2100);

            // Assert
            expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/workplace/clients');
            vi.useRealTimers();
        });
    });

    describe('onboarding tour chips during side questions', () => {
        let toastService: ToastShowService;
        let dismissSpy: any;
        let showSpy: any;

        beforeEach(() => {
            fixture.detectChanges();
            toastService = TestBed.inject(ToastShowService);
            dismissSpy = vi.spyOn(toastService, 'dismissInteractiveReplies');
            showSpy = vi.spyOn(toastService, 'showInteractiveReply');
        });

        function presentExplainStation(index: number): void {
            (component as any).tourIndex = index;
            (component as any).showStationChips(ONBOARDING_STATIONS[index]);
        }

        it('should keep tour chips alive and restore them after a side question during the tour', async () => {
            // Arrange
            presentExplainStation(6);
            expect((component as any).isTourStationPending).toBe(true);
            dismissSpy.mockClear();
            showSpy.mockClear();
            component.inputText = 'Was sehe ich auf dieser Seite?';
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onContent('Eine ausführliche Erklärung der Seite.');
                    callbacks.onMetadata({});
                    callbacks.onDone();
                    return new AbortController();
                },
            );

            // Act
            await component.sendMessage();

            // Assert
            expect(showSpy).toHaveBeenCalledTimes(1);
            expect((component as any).isTourStationPending).toBe(true);
        });

        it('should prioritize tour chips over suggested replies from the answer', async () => {
            // Arrange
            presentExplainStation(6);
            showSpy.mockClear();
            component.inputText = 'Was sehe ich hier?';
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onContent('Antwort');
                    callbacks.onMetadata({ suggestedReplies: { selectionMode: 'single', options: [{ label: 'A', value: 'a' }] } });
                    callbacks.onDone();
                    return new AbortController();
                },
            );

            // Act
            await component.sendMessage();

            // Assert
            const lastConfig = showSpy.mock.calls[showSpy.mock.calls.length - 1][0];
            expect(lastConfig.options.length).toBe(3);
            expect((component as any).isTourStationPending).toBe(true);
        });

        it('should dismiss interactive replies on send when no tour station is pending', async () => {
            // Arrange
            expect((component as any).isTourStationPending).toBe(false);
            dismissSpy.mockClear();
            showSpy.mockClear();
            component.inputText = 'Hallo';
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onContent('Hi');
                    callbacks.onMetadata({});
                    callbacks.onDone();
                    return new AbortController();
                },
            );

            // Act
            await component.sendMessage();

            // Assert
            expect(dismissSpy).toHaveBeenCalled();
            expect(showSpy).not.toHaveBeenCalled();
        });
    });

    describe('voice input', () => {
        beforeEach(() => {
            fixture.detectChanges();
            mockSpeechService.interimResults = new BehaviorSubject('');
        });

        it('should delegate to orchestrator when toggling voice mode via onVoiceButtonClick', () => {
            // Act
            component.onVoiceButtonClick();

            // Assert - orchestrator.toggleVoiceMode should have been called (state is Idle)
            expect(component.orchestrator.toggleVoiceMode).toHaveBeenCalled();
        });

        it('should reflect orchestrator state for voiceModeEnabled', () => {
            expect(component.voiceModeEnabled).toBe(false);
        });

        it('should reflect orchestrator state for isListening', () => {
            expect(component.isListening).toBe(false);
        });
    });

    describe('model selection', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should toggle model dropdown', () => {
            // Arrange
            component.showModelDropdown = false;

            // Act
            component.toggleModelDropdown();

            // Assert
            expect(component.showModelDropdown).toBe(true);

            // Act
            component.toggleModelDropdown();

            // Assert
            expect(component.showModelDropdown).toBe(false);
        });

        it('should select model', () => {
            // Act
            component.selectModel('gpt-3.5');

            // Assert
            expect(mockLlmService.setCurrentModel).toHaveBeenCalledWith('gpt-3.5');
            expect(component.currentModel).toBe('gpt-3.5');
            expect(component.showModelDropdown).toBe(false);
        });

        it('should get current model info', () => {
            // Arrange
            const mockModelInfo = mockModels[0];
            mockLlmService.getModelInfo.mockReturnValue(mockModelInfo);
            component.currentModel = 'gpt-4';

            // Act
            const result = component.getCurrentModelInfo();

            // Assert
            expect(mockLlmService.getModelInfo).toHaveBeenCalledWith('gpt-4');
            expect(result).toEqual(mockModelInfo);
        });
    });

    describe('suggestions and navigation', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should handle suggestion click', () => {
            // Arrange
            vi.spyOn(component, 'sendMessage').mockImplementation(() => Promise.resolve());
            const suggestion = 'Create a new employee';

            // Act
            component.onSuggestionClick(suggestion);

            // Assert
            expect(component.inputText).toBe(suggestion);
            expect(component.sendMessage).toHaveBeenCalled();
        });

        it('should handle navigate click', () => {
            // Act
            component.onNavigateClick('/workplace/clients');

            // Assert
            expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/workplace/clients');
        });
    });

    describe('utility functions', () => {
        it('should format cost correctly', () => {
            // Act & Assert
            expect(component.formatCost(0.01)).toBe('€0.0100/1K tokens');
            expect(component.formatCost(0.1234)).toBe('€0.1234/1K tokens');
        });

        it('should format message content', () => {
            // Arrange
            const content = 'Hello\n**bold** and *italic* and `code`';

            // Act
            const result = component.formatMessage(content);

            // Assert
            expect(result).toBe('Hello<br><strong>bold</strong> and <em>italic</em> and <code>code</code>');
        });

        describe('formatMessage - Markdown rendering', () => {
            it('should render H3 markdown heading as <h4> tag', () => {
                const result = component.formatMessage('### Mitarbeiter & Adressen');
                expect(result).toBe('<h4>Mitarbeiter &amp; Adressen</h4>');
            });

            it('should render H1/H2/H3/H4 with mapped tag levels', () => {
                expect(component.formatMessage('# Top')).toBe('<h2>Top</h2>');
                expect(component.formatMessage('## Section')).toBe('<h3>Section</h3>');
                expect(component.formatMessage('### Sub')).toBe('<h4>Sub</h4>');
                expect(component.formatMessage('#### Detail')).toBe('<h5>Detail</h5>');
            });

            it('should group consecutive list items into a single <ul>', () => {
                const content = '- Eins\n- Zwei\n- Drei';
                const result = component.formatMessage(content);
                expect(result).toBe('<ul><li>Eins</li><li>Zwei</li><li>Drei</li></ul>');
            });

            it('should support * as list bullet alternative to -', () => {
                const result = component.formatMessage('* Item');
                expect(result).toBe('<ul><li>Item</li></ul>');
            });

            it('should render --- as horizontal rule', () => {
                const result = component.formatMessage('Vor\n\n---\n\nNach');
                expect(result).toContain('<hr>');
                expect(result).toContain('Vor');
                expect(result).toContain('Nach');
            });

            it('should combine heading + list + paragraph', () => {
                const content = '### Mitarbeiter\n- Anlegen\n- Suchen\n\nNormaler Text';
                const result = component.formatMessage(content);
                expect(result).toBe(
                    '<h4>Mitarbeiter</h4><ul><li>Anlegen</li><li>Suchen</li></ul><br>Normaler Text',
                );
            });

            it('should apply inline bold inside heading', () => {
                const result = component.formatMessage('### **Wichtig**');
                expect(result).toBe('<h4><strong>Wichtig</strong></h4>');
            });

            it('should apply inline code inside list item', () => {
                const result = component.formatMessage('- Verwende `npm test`');
                expect(result).toBe('<ul><li>Verwende <code>npm test</code></li></ul>');
            });

            it('should escape HTML special characters', () => {
                const result = component.formatMessage('<script>alert("xss")</script>');
                expect(result).not.toContain('<script>');
                expect(result).toContain('&lt;script&gt;');
            });

            it('should escape ampersand', () => {
                const result = component.formatMessage('A & B');
                expect(result).toBe('A &amp; B');
            });

            it('should return empty string for empty input', () => {
                expect(component.formatMessage('')).toBe('');
            });

            it('should join multiple plain lines with <br>', () => {
                const result = component.formatMessage('Zeile eins\nZeile zwei');
                expect(result).toBe('Zeile eins<br>Zeile zwei');
            });

            it('should not append trailing <br> to last line', () => {
                const result = component.formatMessage('Single line');
                expect(result).toBe('Single line');
            });
        });

        describe('formatMessage - Suggestions/Replies marker stripping', () => {
            it('should strip closed [SUGGESTIONS: ...] marker', () => {
                const content = 'Hallo!\n[SUGGESTIONS: "A" | "B" | "C"]';
                const result = component.formatMessage(content);
                expect(result).not.toContain('SUGGESTIONS');
                expect(result).toContain('Hallo!');
            });

            it('should strip closed [REPLIES: ...] marker', () => {
                const content = 'Frage?\n[REPLIES:single "Ja" "Nein"]';
                const result = component.formatMessage(content);
                expect(result).not.toContain('REPLIES');
                expect(result).toContain('Frage?');
            });

            it('should strip trailing open [SUGGESTIONS: marker without closing bracket', () => {
                const content = 'Antwort.\n[SUGGESTIONS: "incomplete';
                const result = component.formatMessage(content);
                expect(result).not.toContain('SUGGESTIONS');
                expect(result).toContain('Antwort.');
            });

            it('should preserve bracketed non-marker text', () => {
                const result = component.formatMessage('Siehe [Doku] dort');
                expect(result).toContain('[Doku]');
            });
        });

        describe('stripForTts - emoji and markdown sanitation', () => {
            const callStripForTts = (text: string): string =>
                (component as unknown as { stripForTts: (t: string) => string }).stripForTts(text);

            it('should remove emoji characters', () => {
                expect(callStripForTts('👋 Hallo')).toBe('Hallo');
            });

            it('should remove multiple emoji including pictographic ranges', () => {
                expect(callStripForTts('📋 Mitarbeiter 📅 Planung')).toBe('Mitarbeiter Planung');
            });

            it('should remove bullet character', () => {
                expect(callStripForTts('• Erster Punkt')).toBe('Erster Punkt');
            });

            it('should remove markdown heading prefix', () => {
                expect(callStripForTts('### Mitarbeiter & Adressen')).toBe('Mitarbeiter & Adressen');
            });

            it('should remove bold/italic/code markers but keep words', () => {
                expect(callStripForTts('**fett** und *kursiv* und `code`')).toBe('fett und kursiv und code');
            });

            it('should remove horizontal rule line', () => {
                const result = callStripForTts('Vor\n---\nNach');
                expect(result).toBe('Vor\nNach');
            });

            it('should collapse consecutive empty lines and trim', () => {
                const result = callStripForTts('  Hallo\n\n\nWelt  ');
                expect(result).toBe('Hallo\nWelt');
            });

            it('should clean welcome message: emoji + bullets + colons', () => {
                const welcome = '👋 Hallo! Ich kann helfen:\n\n• Mitarbeiter anlegen\n• Adressen prüfen\n\nVersuch: "Erstelle Max"';
                const result = callStripForTts(welcome);
                expect(result).not.toMatch(/\p{Extended_Pictographic}/u);
                expect(result).not.toContain('•');
                expect(result).toContain('Mitarbeiter anlegen');
                expect(result).toContain('Adressen prüfen');
            });

            it('should return empty string for empty input', () => {
                expect(callStripForTts('')).toBe('');
            });

            it('should return empty string for emoji-only input', () => {
                expect(callStripForTts('👋')).toBe('');
            });
        });

        it('should handle Enter key press', () => {
            // Arrange
            vi.spyOn(component, 'sendMessage');
            const event = new KeyboardEvent('keypress', { key: 'Enter' });
            vi.spyOn(event, 'preventDefault');

            // Act
            component.onInputKeyPress(event);

            // Assert
            expect(event.preventDefault).toHaveBeenCalled();
            expect(component.sendMessage).toHaveBeenCalled();
        });

        it('should not handle Enter key press with Shift', () => {
            // Arrange
            vi.spyOn(component, 'sendMessage');
            const event = new KeyboardEvent('keypress', {
                key: 'Enter',
                shiftKey: true,
            });
            vi.spyOn(event, 'preventDefault');

            // Act
            component.onInputKeyPress(event);

            // Assert
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(component.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('clearChat', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should clear chat and reset conversation', () => {
            // Arrange
            component.messages = [
                { id: '1', sender: 'user', content: 'Hello', timestamp: new Date() },
                { id: '2', sender: 'assistant', content: 'Hi', timestamp: new Date() },
            ];
            const oldConversationId = component.conversationId;

            // Act
            component.clearChat();

            // Assert
            expect(mockLlmService.clearConversation).toHaveBeenCalledWith(oldConversationId);
            expect(component.conversationId).not.toBe(oldConversationId);
            expect(component.messages.length).toBe(1); // Only welcome message
            expect(component.messages[0].sender).toBe('assistant');
        });
    });

    describe('hasNoApiKey', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should return true when no models available', () => {
            // Arrange
            component.availableModels = [];
            mockLlmProviderService.getCurrentProviders.mockReturnValue([]);

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when currentModel is empty string', () => {
            // Arrange
            const providersWithoutKey = mockProviders.map(p => ({ ...p, hasApiKey: false }));
            mockLlmProviderService.getCurrentProviders.mockReturnValue(providersWithoutKey);
            component.availableModels = mockModels.filter(m => m.isEnabled);
            component.currentModel = '';

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when currentModel is not set', () => {
            // Arrange
            const providersWithoutKey = mockProviders.map(p => ({ ...p, hasApiKey: false }));
            mockLlmProviderService.getCurrentProviders.mockReturnValue(providersWithoutKey);
            component.availableModels = mockModels.filter(m => m.isEnabled);
            component.currentModel = null as any;

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when currentModel not found in availableModels', () => {
            // Arrange
            const providersWithoutKey = mockProviders.map(p => ({ ...p, hasApiKey: false }));
            mockLlmProviderService.getCurrentProviders.mockReturnValue(providersWithoutKey);
            component.availableModels = mockModels.filter(m => m.isEnabled);
            component.currentModel = 'non-existent-model';

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when provider not found for current model', () => {
            // Arrange
            component.availableModels = [
                {
                    ...mockModels[0],
                    providerId: 'unknown-provider',
                },
            ];
            component.currentModel = mockModels[0].modelId;
            mockLlmProviderService.getCurrentProviders.mockReturnValue([]);

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when provider has no apiKey', () => {
            // Arrange
            const providersWithoutKey: IAssistantProvider[] = [
                {
                    ...mockProviders[0],
                    hasApiKey: false,
                },
            ];
            component.availableModels = mockModels.filter(m => m.isEnabled);
            component.currentModel = 'gpt-4';
            mockLlmProviderService.getCurrentProviders.mockReturnValue(providersWithoutKey);

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when current model has valid provider with apiKey', () => {
            // Arrange
            component.availableModels = mockModels.filter(m => m.isEnabled);
            component.currentModel = 'gpt-4';
            mockLlmProviderService.getCurrentProviders.mockReturnValue(mockProviders);

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(false);
        });

        it('should check provider for newly selected model', () => {
            // Arrange
            const modelWithValidKey: IAssistantModel = {
                ...mockModels[0],
                modelId: 'model-with-key',
                providerId: 'openai',
            };
            const modelWithoutValidKey: IAssistantModel = {
                ...mockModels[1],
                modelId: 'model-without-key',
                providerId: 'anthropic',
                isEnabled: true,
            };
            component.availableModels = [modelWithValidKey, modelWithoutValidKey];
            mockLlmProviderService.getCurrentProviders.mockReturnValue(mockProviders);

            // Act - Select model with valid API key
            component.currentModel = 'model-with-key';
            const resultWithKey = component.hasNoApiKey();

            // Assert
            expect(resultWithKey).toBe(false);

            // Act - Switch to model without valid API key
            component.currentModel = 'model-without-key';
            const resultWithoutKey = component.hasNoApiKey();

            // Assert
            expect(resultWithoutKey).toBe(true);
        });
    });
});

