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
            navigate: vi.fn()
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
                        useValue: {
                            state: signal(ConversationState.Idle),
                            voiceModeEnabled: signal(false),
                            interimText: signal(''),
                            initialize: vi.fn(),
                            toggleVoiceMode: vi.fn().mockResolvedValue(undefined),
                            interrupt: vi.fn(),
                            onStreamContent: vi.fn(),
                            onStreamDone: vi.fn(),
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
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/workplace/clients']);
            vi.useRealTimers();
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
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/workplace/clients']);
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

