// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, Pipe, PipeTransform, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AssistantChatComponent } from './assistant-chat.component';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { AsideService } from '../aside.service';
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
import { IOnboardingAskField, ONBOARDING_STATION_LLM_PROVIDER, ONBOARDING_STATION_TITLE, ONBOARDING_STATIONS, ONBOARDING_TOUR_CHOICE } from 'src/app/domain/constants/onboarding-stations';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { IOnboardingState } from 'src/app/domain/models/assistant/welcome.interface';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { IProactiveMessage } from 'src/app/domain/interfaces/proactive-message.interface';
import { IProactiveInboxItem } from 'src/app/domain/interfaces/proactive-inbox.interface';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { PROACTIVE_REACTION } from 'src/app/domain/constants/proactive-reaction.constants';
import { PROACTIVE_TRIGGER_KIND } from 'src/app/domain/constants/proactive-trigger-kinds.constants';
import { KlacksyNavigationService } from 'src/app/core/services/klacksy-navigation.service';

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

    let mockPlanService: any;
    let mockProactiveInboxService: any;

    beforeEach(async () => {
        mockProactiveInboxService = {
            unreadCount: signal(0),
            hasUnread: signal(false),
            refreshUnreadCount: vi.fn(),
            loadUnreadMessages: vi.fn().mockReturnValue(of([])),
            markRead: vi.fn().mockReturnValue(of(void 0)),
            markAllRead: vi.fn().mockReturnValue(of(void 0)),
        };

        mockPlanService = {
            activePlan: signal(null),
            totalSteps: signal(0),
            isLoading: signal(false),
            isApproving: signal(false),
            isAborting: signal(false),
            hasVisiblePlan: signal(false),
            refreshActivePlan: vi.fn().mockReturnValue(of(null)),
            approve: vi.fn().mockReturnValue(of({})),
            abort: vi.fn().mockReturnValue(of({})),
        };

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
            setProactiveReaction: vi.fn().mockReturnValue(of(void 0)),
            muteTriggerKind: vi.fn().mockReturnValue(of({ triggerKind: 'unstaffed_shift', muted: true })),
            modelsInitialized: signal(true),
            selectedModelId: signal('gpt-4'),
            availableModels: signal<IAssistantModel[]>(mockModels.filter(m => m.isEnabled)),
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
            navigateByUrl: vi.fn().mockResolvedValue(true),
            url: '/workplace/dashboard'
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
                { provide: DataManagementAgentPlanService, useValue: mockPlanService },
                { provide: DataManagementProactiveInboxService, useValue: mockProactiveInboxService },
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
                                setLocale: vi.fn(),
                                errors$: of(),
                                toggleVoiceMode: vi.fn().mockResolvedValue(undefined),
                                interrupt: vi.fn(),
                                onStreamContent: vi.fn(),
                                onStreamDone: vi.fn(),
                                onStreamError: vi.fn(),
                                onStreamFunctionCall: vi.fn(),
                                onStreamPlanningEnded: vi.fn(),
                                stopAutoSpeak: vi.fn(),
                                isAutoSpeakStreaming: vi.fn(() => false),
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
        expect(component.availableModels().length).toBe(1);
        expect(component.availableModels()[0].modelId).toBe('gpt-4');
    });

    it('should set current model on init', async () => {
        // Act
        fixture.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert
        expect(component.currentModel()).toBe('gpt-4');
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should not send empty message', async () => {
            // Arrange
            component.inputText.set('   ');

            // Act
            await component.sendMessage();

            // Assert
            expect(mockLlmService.sendMessage).not.toHaveBeenCalled();
        });

        it('should send message and handle response', async () => {
            // Arrange
            component.inputText.set('Hello');
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
            expect(component.inputText()).toBe('');
        });

        it('should handle error in sendMessage', async () => {
            // Arrange
            component.inputText.set('Hello');
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
            expect(component.isProcessing()).toBe(false);
        });

        it('should navigate when actionPerformed is true', async () => {
            // Arrange
            vi.useFakeTimers();
            component.inputText.set('Navigate to clients');
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

    describe('navigation toast suppression', () => {
        let toastService: ToastShowService;
        let showSpy: any;

        beforeEach(() => {
            fixture.detectChanges();
            toastService = TestBed.inject(ToastShowService);
            showSpy = vi.spyOn(toastService, 'showInteractiveReply');
        });

        function streamWithMetadata(metadata: Record<string, unknown>): void {
            component.inputText.set('Erkläre mir die Seite');
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onContent('Antwort');
                    callbacks.onMetadata(metadata);
                    callbacks.onDone();
                    return new AbortController();
                },
            );
        }

        it('does not offer navigation when an explain_page_* call auto-navigates', async () => {
            streamWithMetadata({
                navigateTo: '/workplace/client-availability',
                functionCalls: [{ functionName: 'explain_page_availability' }],
            });

            await component.sendMessage();

            expect(showSpy).not.toHaveBeenCalled();
        });

        it('does not offer navigation to the page the user is already on', async () => {
            streamWithMetadata({ navigateTo: '/workplace/dashboard' });

            await component.sendMessage();

            expect(showSpy).not.toHaveBeenCalled();
        });

        it('still offers navigation to a different page without explain calls', async () => {
            streamWithMetadata({ navigateTo: '/workplace/group' });

            await component.sendMessage();

            expect(showSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onboarding llm-provider station recheck', () => {
        let onboarding: OnboardingService;

        const onboardingState = (overrides: Partial<IOnboardingState> = {}): IOnboardingState => ({
            shouldOffer: false,
            showCard: true,
            status: 'in_progress',
            completedStations: [],
            ...overrides,
        });

        const llmStation = ONBOARDING_STATIONS.find(
            (station) => station.id === ONBOARDING_STATION_LLM_PROVIDER,
        )!;

        beforeEach(() => {
            fixture.detectChanges();
            onboarding = TestBed.inject(OnboardingService);
            vi.spyOn(onboarding, 'accept').mockImplementation(() => undefined);
            vi.spyOn(onboarding, 'markStationCompleted').mockImplementation(() => undefined);
            vi.spyOn(component as any, 'presentStationAtCursor').mockImplementation(() => undefined);
            vi.spyOn(component as any, 'advanceTour').mockImplementation(() => undefined);
        });

        it('posts the offline hint once when starting the tour without a live LLM', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: false }));

            component.startOnboardingTour();
            component.startOnboardingTour();

            const offlineCalls = (mockTranslateService.instant as any).mock.calls.filter(
                (call: any[]) => call[0] === 'assistant-chat.onboarding.llm.offline',
            );
            expect(offlineCalls.length).toBe(1);
        });

        it('does not post the offline hint when the LLM is live', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: true }));

            component.startOnboardingTour();

            expect(mockTranslateService.instant).not.toHaveBeenCalledWith('assistant-chat.onboarding.llm.offline');
        });

        it('posts the free-provider hint when presenting the llm-provider station while offline', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: false }));

            (component as any).maybePostFreeProviderHint(llmStation);

            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.onboarding.llm.free-providers');
        });

        it('does not post the free-provider hint when the LLM is live', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: true }));

            (component as any).maybePostFreeProviderHint(llmStation);

            expect(mockTranslateService.instant).not.toHaveBeenCalledWith('assistant-chat.onboarding.llm.free-providers');
        });

        it('rechecks the state on done and posts the online message when the LLM came up', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: false }));
            const refreshSpy = vi.spyOn(onboarding, 'refreshState').mockImplementation((completedStationId?: string) => {
                onboarding.applyWelcome(onboardingState({
                    llmLive: true,
                    completedStations: completedStationId ? [completedStationId] : [],
                }));
                return of(onboardingState({ llmLive: true }));
            });

            (component as any).handleStationChoice(llmStation, 'done');

            expect(refreshSpy).toHaveBeenCalledWith(ONBOARDING_STATION_LLM_PROVIDER);
            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.onboarding.llm.online');
            expect((component as any).advanceTour).toHaveBeenCalled();
        });

        it('posts the still-offline hint on skip when the LLM stays down', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: false }));
            const refreshSpy = vi.spyOn(onboarding, 'refreshState').mockReturnValue(of(onboardingState({ llmLive: false })));

            (component as any).handleStationChoice(llmStation, 'skip');

            expect(refreshSpy).toHaveBeenCalledWith(undefined);
            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.onboarding.llm.still-offline');
            expect((component as any).advanceTour).toHaveBeenCalled();
        });

        it('advances without a recheck when the LLM was already live', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: true }));
            const refreshSpy = vi.spyOn(onboarding, 'refreshState');

            (component as any).handleStationChoice(llmStation, 'done');

            expect(refreshSpy).not.toHaveBeenCalled();
            expect(onboarding.markStationCompleted).toHaveBeenCalledWith(ONBOARDING_STATION_LLM_PROVIDER);
            expect((component as any).advanceTour).toHaveBeenCalled();
        });

        it('leaves other stations untouched by the recheck flow', () => {
            onboarding.applyWelcome(onboardingState({ llmLive: false }));
            const refreshSpy = vi.spyOn(onboarding, 'refreshState');

            (component as any).handleStationChoice(ONBOARDING_STATIONS[1], 'done');

            expect(refreshSpy).not.toHaveBeenCalled();
            expect(onboarding.markStationCompleted).toHaveBeenCalledWith(ONBOARDING_STATIONS[1].id);
            expect((component as any).advanceTour).toHaveBeenCalled();
        });
    });

    describe('onboarding double-click-edit hint', () => {
        const titleStation = ONBOARDING_STATIONS.find((station) => station.id === ONBOARDING_STATION_TITLE)!;
        const nonTitleStation = ONBOARDING_STATIONS.find((station) => station.id !== ONBOARDING_STATION_TITLE)!;

        beforeEach(() => {
            fixture.detectChanges();
        });

        it('posts the double-click-edit hint when presenting the title station', () => {
            (component as any).maybePostDoubleClickEditHint(titleStation);

            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.onboarding.hint.double-click-edit');
        });

        it('does not post the double-click-edit hint for any other station', () => {
            (component as any).maybePostDoubleClickEditHint(nonTitleStation);

            expect(mockTranslateService.instant).not.toHaveBeenCalledWith('assistant-chat.onboarding.hint.double-click-edit');
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

        function presentExplainStation(stationId: string): void {
            const index = ONBOARDING_STATIONS.findIndex((station) => station.id === stationId);
            (component as any).tourIndex = index;
            (component as any).showStationChips(ONBOARDING_STATIONS[index]);
        }

        it('should keep tour chips alive and restore them after a side question during the tour', async () => {
            // Arrange
            presentExplainStation('weekend');
            expect((component as any).isTourStationPending).toBe(true);
            dismissSpy.mockClear();
            showSpy.mockClear();
            component.inputText.set('Was sehe ich auf dieser Seite?');
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
            presentExplainStation('weekend');
            showSpy.mockClear();
            component.inputText.set('Was sehe ich hier?');
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
            expect(lastConfig.options.length).toBe(4); // back + done + skip + end ('weekend' is not the first station)
            expect((component as any).isTourStationPending).toBe(true);
        });

        it('should dismiss interactive replies on send when no tour station is pending', async () => {
            // Arrange
            expect((component as any).isTourStationPending).toBe(false);
            dismissSpy.mockClear();
            showSpy.mockClear();
            component.inputText.set('Hallo');
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

    describe('welcome/greeting toast tour gating', () => {
        let onboarding: OnboardingService;
        let toastService: ToastShowService;
        let dismissSpy: any;
        let showSpy: any;

        const onboardingState = (overrides: Partial<IOnboardingState> = {}): IOnboardingState => ({
            shouldOffer: false,
            showCard: true,
            status: 'in_progress',
            completedStations: [],
            ...overrides,
        });

        beforeEach(() => {
            fixture.detectChanges();
            onboarding = TestBed.inject(OnboardingService);
            toastService = TestBed.inject(ToastShowService);
            dismissSpy = vi.spyOn(toastService, 'dismissInteractiveReplies');
            showSpy = vi.spyOn(toastService, 'showInteractiveReply');
        });

        it('should not show the welcome action toast while the setup tour is active', () => {
            // Arrange
            onboarding.applyWelcome(onboardingState());
            showSpy.mockClear();
            dismissSpy.mockClear();

            // Act
            (component as any).showActionsAsToast(['Erstelle einen neuen Mitarbeiter']);

            // Assert
            expect(showSpy).not.toHaveBeenCalled();
            expect(dismissSpy).toHaveBeenCalled();
        });

        it('should show the welcome action toast when the setup tour is not active', () => {
            // Arrange
            onboarding.applyWelcome(null);
            showSpy.mockClear();
            dismissSpy.mockClear();

            // Act
            (component as any).showActionsAsToast(['Erstelle einen neuen Mitarbeiter']);

            // Assert
            expect(showSpy).toHaveBeenCalledTimes(1);
        });

        it('should not show greeting options toast while the setup tour is active', () => {
            // Arrange
            onboarding.applyWelcome(onboardingState());
            showSpy.mockClear();
            dismissSpy.mockClear();

            // Act
            (component as any).showGreetingOptionsAsToast([{ label: 'Einstellungen öffnen', value: '/workplace/settings' }]);

            // Assert
            expect(showSpy).not.toHaveBeenCalled();
            expect(dismissSpy).toHaveBeenCalled();
        });

        it('should show greeting options toast when the setup tour is not active', () => {
            // Arrange
            onboarding.applyWelcome(null);
            showSpy.mockClear();
            dismissSpy.mockClear();

            // Act
            (component as any).showGreetingOptionsAsToast([{ label: 'Einstellungen öffnen', value: '/workplace/settings' }]);

            // Assert
            expect(showSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onboarding tour back navigation', () => {
        let toastService: ToastShowService;
        let showSpy: any;

        beforeEach(() => {
            fixture.detectChanges();
            toastService = TestBed.inject(ToastShowService);
            showSpy = vi.spyOn(toastService, 'showInteractiveReply');
        });

        function presentStation(stationId: string): void {
            const index = ONBOARDING_STATIONS.findIndex((station) => station.id === stationId);
            (component as any).tourIndex = index;
            (component as any).showStationChips(ONBOARDING_STATIONS[index]);
        }

        it('should not offer a back chip on the first station', () => {
            // Arrange
            presentStation('title');

            // Assert
            const config = showSpy.mock.calls[showSpy.mock.calls.length - 1][0];
            expect(config.options.some((o: any) => o.value === ONBOARDING_TOUR_CHOICE.Back)).toBe(false);
        });

        it('should offer a back chip on any station after the first', () => {
            // Arrange
            presentStation('weekend');

            // Assert
            const config = showSpy.mock.calls[showSpy.mock.calls.length - 1][0];
            expect(config.options[0].value).toBe(ONBOARDING_TOUR_CHOICE.Back);
        });

        it('should move the tour cursor one station back without touching completion state', () => {
            // Arrange
            const onboarding = TestBed.inject(OnboardingService);
            const markCompletedSpy = vi.spyOn(onboarding, 'markStationCompleted').mockImplementation(() => undefined);
            const index = ONBOARDING_STATIONS.findIndex((station) => station.id === 'weekend');
            (component as any).tourIndex = index;

            // Act
            (component as any).handleStationChoice(ONBOARDING_STATIONS[index], ONBOARDING_TOUR_CHOICE.Back);

            // Assert
            expect((component as any).tourIndex).toBe(index - 1);
            expect(markCompletedSpy).not.toHaveBeenCalled();
        });

        it('should reflect the live tour position in displayedTourProgress after going back, decoupled from persisted progress', () => {
            // Arrange
            const onboarding = TestBed.inject(OnboardingService);
            vi.spyOn(onboarding, 'accept').mockImplementation(() => undefined);
            const completed = ONBOARDING_STATIONS.slice(0, 5).map((station) => station.id);
            onboarding.applyWelcome({ shouldOffer: false, showCard: true, status: 'in_progress', completedStations: completed });

            // Act
            component.startOnboardingTour();
            (component as any).retreatTour();
            (component as any).retreatTour();

            // Assert
            expect(onboarding.progress()).toBe(5);
            expect(component.displayedTourProgress()).toBe(3);
        });

        it('should not move the cursor before the first station', () => {
            // Arrange
            presentStation('title');

            // Act
            (component as any).handleStationChoice(ONBOARDING_STATIONS[0], ONBOARDING_TOUR_CHOICE.Back);

            // Assert
            expect((component as any).tourIndex).toBe(0);
        });

        it('should offer a back chip on the language station when it is not first', () => {
            // Arrange
            const index = ONBOARDING_STATIONS.findIndex((station) => station.id === 'default-language');
            (component as any).tourIndex = index;

            // Act
            (component as any).showLanguageChoiceChips(ONBOARDING_STATIONS[index]);

            // Assert
            const config = showSpy.mock.calls[showSpy.mock.calls.length - 1][0];
            expect(config.options[0].value).toBe(ONBOARDING_TOUR_CHOICE.Back);
        });

        it('should move back from the language station via handleLanguageChoice', () => {
            // Arrange
            const index = ONBOARDING_STATIONS.findIndex((station) => station.id === 'default-language');
            const field: IOnboardingAskField = { promptKey: 'x', kind: 'text', settingTypes: [] };

            // Act
            (component as any).tourIndex = index;
            (component as any).handleLanguageChoice(ONBOARDING_STATIONS[index].id, field, ONBOARDING_TOUR_CHOICE.Back);

            // Assert
            expect((component as any).tourIndex).toBe(index - 1);
        });

        it('should resume one station before the persisted first-pending station (survives a restart)', () => {
            // Arrange
            const onboarding = TestBed.inject(OnboardingService);
            vi.spyOn(onboarding, 'accept').mockImplementation(() => undefined);
            const presentSpy = vi.spyOn(component as any, 'presentStationAtCursor').mockImplementation(() => undefined);
            const completed = ONBOARDING_STATIONS.slice(0, 5).map((station) => station.id);
            onboarding.applyWelcome({ shouldOffer: false, showCard: true, status: 'in_progress', completedStations: completed });

            // Act
            component.resumeTourOneStepBack();

            // Assert
            expect((component as any).tourIndex).toBe(4);
            expect(presentSpy).toHaveBeenCalled();
        });

        it('should not resume before station 0 when the first pending station is already the first', () => {
            // Arrange
            const onboarding = TestBed.inject(OnboardingService);
            vi.spyOn(onboarding, 'accept').mockImplementation(() => undefined);
            vi.spyOn(component as any, 'presentStationAtCursor').mockImplementation(() => undefined);
            onboarding.applyWelcome({ shouldOffer: false, showCard: true, status: 'in_progress', completedStations: [] });

            // Act
            component.resumeTourOneStepBack();

            // Assert
            expect((component as any).tourIndex).toBe(0);
        });

        it('should keep stepping back on repeated presses instead of resetting to the persisted position', () => {
            // Arrange
            const onboarding = TestBed.inject(OnboardingService);
            vi.spyOn(onboarding, 'accept').mockImplementation(() => undefined);
            const completed = ONBOARDING_STATIONS.slice(0, 5).map((station) => station.id);
            onboarding.applyWelcome({ shouldOffer: false, showCard: true, status: 'in_progress', completedStations: completed });

            // Act
            component.resumeTourOneStepBack();
            expect((component as any).tourIndex).toBe(4);
            component.resumeTourOneStepBack();

            // Assert
            expect((component as any).tourIndex).toBe(3);
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
            component.showModelDropdown.set(false);

            // Act
            component.toggleModelDropdown();

            // Assert
            expect(component.showModelDropdown()).toBe(true);

            // Act
            component.toggleModelDropdown();

            // Assert
            expect(component.showModelDropdown()).toBe(false);
        });

        it('should select model', () => {
            // Act
            component.selectModel('gpt-3.5');

            // Assert
            expect(mockLlmService.setCurrentModel).toHaveBeenCalledWith('gpt-3.5');
            expect(component.currentModel()).toBe('gpt-3.5');
            expect(component.showModelDropdown()).toBe(false);
        });

        it('should get current model info', () => {
            // Arrange
            const mockModelInfo = mockModels[0];
            mockLlmService.getModelInfo.mockReturnValue(mockModelInfo);
            component.currentModel.set('gpt-4');

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
            expect(component.inputText()).toBe(suggestion);
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

            it('should render markdown links as anchor tags opening in a new tab', () => {
                const result = component.formatMessage('Hol dir einen Key: [Groq](https://console.groq.com/keys)');
                expect(result).toContain('<a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq</a>');
            });

            it('should not render links for non-http schemes', () => {
                const result = component.formatMessage('[x](javascript:alert(1))');
                expect(result).not.toContain('<a ');
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
            mockLlmService.availableModels.set([]);
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
            mockLlmService.availableModels.set(mockModels.filter(m => m.isEnabled));
            component.currentModel.set('');

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when currentModel is not set', () => {
            // Arrange
            const providersWithoutKey = mockProviders.map(p => ({ ...p, hasApiKey: false }));
            mockLlmProviderService.getCurrentProviders.mockReturnValue(providersWithoutKey);
            mockLlmService.availableModels.set(mockModels.filter(m => m.isEnabled));
            component.currentModel.set(null as any);

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when currentModel not found in availableModels', () => {
            // Arrange
            const providersWithoutKey = mockProviders.map(p => ({ ...p, hasApiKey: false }));
            mockLlmProviderService.getCurrentProviders.mockReturnValue(providersWithoutKey);
            mockLlmService.availableModels.set(mockModels.filter(m => m.isEnabled));
            component.currentModel.set('non-existent-model');

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when provider not found for current model', () => {
            // Arrange
            mockLlmService.availableModels.set([
                {
                    ...mockModels[0],
                    providerId: 'unknown-provider',
                },
            ]);
            component.currentModel.set(mockModels[0].modelId);
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
            mockLlmService.availableModels.set(mockModels.filter(m => m.isEnabled));
            component.currentModel.set('gpt-4');
            mockLlmProviderService.getCurrentProviders.mockReturnValue(providersWithoutKey);

            // Act
            const result = component.hasNoApiKey();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when current model has valid provider with apiKey', () => {
            // Arrange
            mockLlmService.availableModels.set(mockModels.filter(m => m.isEnabled));
            component.currentModel.set('gpt-4');
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
            mockLlmService.availableModels.set([modelWithValidKey, modelWithoutValidKey]);
            mockLlmProviderService.getCurrentProviders.mockReturnValue(mockProviders);

            // Act - Select model with valid API key
            component.currentModel.set('model-with-key');
            const resultWithKey = component.hasNoApiKey();

            // Assert
            expect(resultWithKey).toBe(false);

            // Act - Switch to model without valid API key
            component.currentModel.set('model-without-key');
            const resultWithoutKey = component.hasNoApiKey();

            // Assert
            expect(resultWithoutKey).toBe(true);
        });
    });

    describe('TTS barge-in (interrupt monologue on user input)', () => {
        it('typing a printable key interrupts a running TTS playback', () => {
            const interruptSpy = vi.spyOn(component.ttsService, 'interrupt');

            component.onInputKeyPress(new KeyboardEvent('keydown', { key: 'a' }));

            expect(interruptSpy).toHaveBeenCalledOnce();
        });

        it('modifier shortcuts do not interrupt TTS playback', () => {
            const interruptSpy = vi.spyOn(component.ttsService, 'interrupt');

            component.onInputKeyPress(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));

            expect(interruptSpy).not.toHaveBeenCalled();
        });

        it('sending a message interrupts a running TTS playback', async () => {
            const interruptSpy = vi.spyOn(component.ttsService, 'interrupt');
            mockLlmService.sendMessageStream.mockReturnValue(new AbortController());
            component.inputText.set('Neue Frage');

            await component.sendMessage();

            expect(interruptSpy).toHaveBeenCalled();
        });

        it('sending with empty input does not touch TTS playback', async () => {
            const interruptSpy = vi.spyOn(component.ttsService, 'interrupt');
            component.inputText.set('   ');

            await component.sendMessage();

            expect(interruptSpy).not.toHaveBeenCalled();
        });

        it('typing a printable key stops sentence-wise auto-speak playback', () => {
            component.onInputKeyPress(new KeyboardEvent('keydown', { key: 'a' }));

            expect(component.orchestrator.stopAutoSpeak).toHaveBeenCalledOnce();
        });

        it('sending a message stops sentence-wise auto-speak playback', async () => {
            mockLlmService.sendMessageStream.mockReturnValue(new AbortController());
            component.inputText.set('Neue Frage');

            await component.sendMessage();

            expect(component.orchestrator.stopAutoSpeak).toHaveBeenCalled();
        });
    });

    describe('Tool step history', () => {
        it('function calls append steps and function results mark the matching step done', async () => {
            let callbacks: any;
            mockLlmService.sendMessageStream.mockImplementation((_msg: string, _conv: string, cbs: any) => {
                callbacks = cbs;
                return new AbortController();
            });
            component.inputText.set('Lege einen Mitarbeiter an');
            await component.sendMessage();

            callbacks.onFunctionCall({ functionName: 'create_employee', parameters: {} });
            callbacks.onFunctionCall({ functionName: 'search_address', parameters: {} });
            expect(component.toolSteps().length).toBe(2);
            expect(component.toolSteps().every((s) => !s.done)).toBe(true);

            callbacks.onFunctionResult({ functionName: 'search_address', functionResult: '', executionType: '' });
            expect(component.toolSteps().find((s) => s.functionName === 'search_address')?.done).toBe(true);
            expect(component.toolSteps().find((s) => s.functionName === 'create_employee')?.done).toBe(false);

            callbacks.onContent('Erledigt.');
            expect(component.toolSteps().length).toBe(0);
        });
    });

    describe('AgentPlan panel wiring', () => {
        it('refreshes the active plan when the aside becomes visible', () => {
            const asideService = TestBed.inject(AsideService);

            fixture.detectChanges();
            TestBed.flushEffects();
            asideService.show();
            TestBed.flushEffects();

            expect(mockPlanService.refreshActivePlan).toHaveBeenCalled();
        });

        it('does not re-fetch the active plan on every streamed message while the aside stays open', () => {
            const asideService = TestBed.inject(AsideService);

            fixture.detectChanges();
            TestBed.flushEffects();
            asideService.show();
            TestBed.flushEffects();
            expect(mockPlanService.refreshActivePlan).toHaveBeenCalledTimes(1);

            component.orchestrator.addMessage({
                id: 'stream-1',
                sender: 'assistant',
                content: 'partial',
                formattedContent: 'partial',
                timestamp: new Date(),
            });
            TestBed.flushEffects();

            expect(mockPlanService.refreshActivePlan).toHaveBeenCalledTimes(1);
        });

        it('onPlanApprove calls the plan service with the given plan id', () => {
            fixture.detectChanges();

            component.onPlanApprove('plan-1');

            expect(mockPlanService.approve).toHaveBeenCalledWith('plan-1');
        });

        it('onPlanApprove shows an error toast when approving fails', () => {
            mockPlanService.approve.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
            const toastService = TestBed.inject(ToastShowService);
            const showErrorSpy = vi.spyOn(toastService, 'showError');
            fixture.detectChanges();

            component.onPlanApprove('plan-1');

            expect(showErrorSpy).toHaveBeenCalled();
        });

        it('onPlanAbort calls the plan service with the given plan id', () => {
            fixture.detectChanges();

            component.onPlanAbort('plan-1');

            expect(mockPlanService.abort).toHaveBeenCalledWith('plan-1');
        });

        it('onPlanAbort shows a conflict-specific toast on a 409 response', () => {
            mockPlanService.abort.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
            const toastService = TestBed.inject(ToastShowService);
            const showErrorSpy = vi.spyOn(toastService, 'showError');
            fixture.detectChanges();

            component.onPlanAbort('plan-1');

            expect(showErrorSpy).toHaveBeenCalled();
            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.plan-execution.abort-conflict');
        });

        it('onPlanAbort shows a generic error toast on a non-conflict failure', () => {
            mockPlanService.abort.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
            const toastService = TestBed.inject(ToastShowService);
            const showErrorSpy = vi.spyOn(toastService, 'showError');
            fixture.detectChanges();

            component.onPlanAbort('plan-1');

            expect(showErrorSpy).toHaveBeenCalled();
            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.plan-execution.abort-error');
        });

        it('exposes hasVisiblePlan from the plan service for the template', () => {
            fixture.detectChanges();

            expect(component.planService.hasVisiblePlan()).toBe(false);

            mockPlanService.hasVisiblePlan.set(true);

            expect(component.planService.hasVisiblePlan()).toBe(true);
        });
    });

    describe('proactive background messages', () => {
        let signalRService: AssistantSignalRService;

        beforeEach(() => {
            fixture.detectChanges();
            signalRService = TestBed.inject(AssistantSignalRService);
        });

        it('tags a message pushed via proactiveMessage$ with messageKind "proactive"', () => {
            // Arrange
            const proactiveMessage: IProactiveMessage = {
                messageId: 'proactive-1',
                content: 'Bei Anton Heinz weichen die Stunden im Zeitraum 2026-07 um -170.0 h vom Soll ab.',
                timestamp: new Date().toISOString(),
                messageType: 'proactive',
            };

            // Act
            signalRService.proactiveMessage$.next(proactiveMessage);

            // Assert
            const appended = component.messages.find((m) => m.id === 'proactive-1');
            expect(appended).toBeDefined();
            expect(appended?.messageKind).toBe('proactive');
        });

        it('tags a message pushed via onboardingPrompt$ with messageKind "onboarding"', () => {
            // Arrange
            const onboardingMessage: IProactiveMessage = {
                messageId: 'onboarding-1',
                content: 'Möchtest du die Einrichtung fortsetzen?',
                timestamp: new Date().toISOString(),
                messageType: 'onboarding',
            };

            // Act
            signalRService.onboardingPrompt$.next(onboardingMessage);

            // Assert
            const appended = component.messages.find((m) => m.id === 'onboarding-1');
            expect(appended).toBeDefined();
            expect(appended?.messageKind).toBe('onboarding');
        });

        it('records a helpful reaction and locks both reaction buttons', async () => {
            // Arrange
            const proactiveMessage: IProactiveMessage = {
                messageId: 'proactive-reaction-1',
                content: 'Eine Periode ist überfällig.',
                timestamp: new Date().toISOString(),
                messageType: 'proactive',
            };
            signalRService.proactiveMessage$.next(proactiveMessage);
            const appended = component.messages.find((m) => m.id === 'proactive-reaction-1')!;

            // Act
            await component.submitProactiveReaction(appended, PROACTIVE_REACTION.Helpful);

            // Assert
            expect(mockLlmService.setProactiveReaction).toHaveBeenCalledWith(
                'proactive-reaction-1',
                PROACTIVE_REACTION.Helpful,
            );
            const updated = component.messages.find((m) => m.id === 'proactive-reaction-1')!;
            expect(updated.proactiveReaction).toBe(PROACTIVE_REACTION.Helpful);
            expect(component.pendingReactionMessageId()).toBeNull();

            // Act again on the already-reacted message
            await component.submitProactiveReaction(updated, PROACTIVE_REACTION.Dismissed);

            // Assert: no second call, reaction unchanged
            expect(mockLlmService.setProactiveReaction).toHaveBeenCalledTimes(1);
            expect(
                component.messages.find((m) => m.id === 'proactive-reaction-1')?.proactiveReaction,
            ).toBe(PROACTIVE_REACTION.Helpful);
        });

        it('ignores a second click while a reaction request is still pending', async () => {
            // Arrange
            const request$ = new Subject<void>();
            mockLlmService.setProactiveReaction.mockReturnValue(request$.asObservable());
            const proactiveMessage: IProactiveMessage = {
                messageId: 'proactive-reaction-pending',
                content: 'Eine Schicht ist unbesetzt.',
                timestamp: new Date().toISOString(),
                messageType: 'proactive',
            };
            signalRService.proactiveMessage$.next(proactiveMessage);
            const appended = component.messages.find((m) => m.id === 'proactive-reaction-pending')!;

            // Act
            const firstCall = component.submitProactiveReaction(appended, PROACTIVE_REACTION.Helpful);
            expect(component.pendingReactionMessageId()).toBe('proactive-reaction-pending');
            await component.submitProactiveReaction(appended, PROACTIVE_REACTION.Dismissed);

            // Assert
            expect(mockLlmService.setProactiveReaction).toHaveBeenCalledTimes(1);

            request$.next();
            request$.complete();
            await firstCall;
            expect(component.pendingReactionMessageId()).toBeNull();
        });

        it('does not send a reaction for onboarding messages', async () => {
            // Arrange
            const onboardingMessage: IProactiveMessage = {
                messageId: 'onboarding-reaction-1',
                content: 'Möchtest du die Einrichtung fortsetzen?',
                timestamp: new Date().toISOString(),
                messageType: 'onboarding',
            };
            signalRService.onboardingPrompt$.next(onboardingMessage);
            const appended = component.messages.find((m) => m.id === 'onboarding-reaction-1')!;

            // Act
            await component.submitProactiveReaction(appended, PROACTIVE_REACTION.Helpful);

            // Assert
            expect(mockLlmService.setProactiveReaction).not.toHaveBeenCalled();
            expect(appended.proactiveReaction).toBeUndefined();
        });

        it('discards the reaction, re-enables the buttons and shows an error toast when the PUT fails', async () => {
            // Arrange
            mockLlmService.setProactiveReaction.mockReturnValue(
                throwError(() => new Error('offline')),
            );
            const toastService = TestBed.inject(ToastShowService);
            const showErrorSpy = vi.spyOn(toastService, 'showError');
            const proactiveMessage: IProactiveMessage = {
                messageId: 'proactive-reaction-2',
                content: 'Eine Verfügbarkeit fehlt.',
                timestamp: new Date().toISOString(),
                messageType: 'proactive',
            };
            signalRService.proactiveMessage$.next(proactiveMessage);
            const appended = component.messages.find((m) => m.id === 'proactive-reaction-2')!;

            // Act
            await component.submitProactiveReaction(appended, PROACTIVE_REACTION.Dismissed);

            // Assert
            expect(
                component.messages.find((m) => m.id === 'proactive-reaction-2')?.proactiveReaction,
            ).toBeUndefined();
            expect(component.pendingReactionMessageId()).toBeNull();
            expect(showErrorSpy).toHaveBeenCalled();
            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.error.generic');

            // Act: retry succeeds after the transient failure
            mockLlmService.setProactiveReaction.mockReturnValue(of(void 0));
            const current = component.messages.find((m) => m.id === 'proactive-reaction-2')!;
            await component.submitProactiveReaction(current, PROACTIVE_REACTION.Dismissed);

            // Assert
            expect(
                component.messages.find((m) => m.id === 'proactive-reaction-2')?.proactiveReaction,
            ).toBe(PROACTIVE_REACTION.Dismissed);
        });

        it('leaves messageKind unset for a regular conversation reply', async () => {
            // Arrange
            component.inputText.set('Hallo');
            mockLlmService.sendMessageStream.mockImplementation(
                (_msg: string, _convId: string, callbacks: any) => {
                    callbacks.onContent('Hi there!');
                    callbacks.onMetadata({});
                    callbacks.onDone();
                    return new AbortController();
                },
            );

            // Act
            await component.sendMessage();

            // Assert
            const assistantReply = component.messages.find((m) => m.sender === 'assistant' && m.content === 'Hi there!');
            expect(assistantReply?.messageKind).toBeUndefined();
        });
    });

    describe('proactive inbox (while you were away)', () => {
        let asideService: AsideService;
        let signalRService: AssistantSignalRService;

        const inboxItem = (overrides: Partial<IProactiveInboxItem> = {}): IProactiveInboxItem => ({
            id: 'inbox-1',
            content: 'Bei Anton Heinz weichen die Stunden im Zeitraum 2026-07 vom Soll ab.',
            contentParams: {},
            severity: 'medium',
            reaction: null,
            createdUtc: '2026-07-24T06:00:00Z',
            readAtUtc: null,
            ...overrides,
        });

        beforeEach(() => {
            fixture.detectChanges();
            asideService = TestBed.inject(AsideService);
            signalRService = TestBed.inject(AssistantSignalRService);
        });

        afterEach(() => {
            asideService.hide();
            fixture.detectChanges();
        });

        it('loads unread messages on aside open, appends them at the end and marks all read', () => {
            // Arrange
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(of([inboxItem()]));

            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            expect(mockProactiveInboxService.loadUnreadMessages).toHaveBeenCalledTimes(1);
            const lastMessage = component.messages[component.messages.length - 1];
            expect(lastMessage.id).toBe('inbox-1');
            expect(lastMessage.messageKind).toBe('proactive');
            expect(component.inboxHeadingMessageId()).toBe('inbox-1');
            expect(mockProactiveInboxService.markAllRead).toHaveBeenCalledTimes(1);
        });

        it('appends inbox messages after an existing conversation with the heading anchored at the block start', () => {
            // Arrange
            component.orchestrator.addMessage({
                id: 'user-1',
                sender: 'user',
                content: 'Wie viele Ferientage habe ich noch?',
                timestamp: new Date(),
            });
            component.orchestrator.addMessage({
                id: 'assistant-1',
                sender: 'assistant',
                content: 'Du hast noch 12 Ferientage.',
                timestamp: new Date(),
            });
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(
                of([
                    inboxItem({ id: 'inbox-a', content: 'Erste Inbox-Nachricht.' }),
                    inboxItem({ id: 'inbox-b', content: 'Zweite Inbox-Nachricht.' }),
                ]),
            );

            // Act
            asideService.show();
            fixture.detectChanges();
            fixture.detectChanges();

            // Assert
            const ids = component.messages.map((m) => m.id);
            const inboxStart = ids.indexOf('inbox-a');
            expect(ids.indexOf('user-1')).toBeGreaterThanOrEqual(0);
            expect(ids.indexOf('user-1')).toBeLessThan(inboxStart);
            expect(ids.indexOf('assistant-1')).toBeLessThan(inboxStart);
            expect(ids.slice(-2)).toEqual(['inbox-a', 'inbox-b']);
            expect(component.inboxHeadingMessageId()).toBe('inbox-a');

            const messagesElement: HTMLElement = fixture.nativeElement.querySelector('.messages');
            const children = Array.from(messagesElement.children);
            const headingIndex = children.findIndex((el) => el.classList.contains('inbox-heading'));
            expect(headingIndex).toBe(inboxStart);
            expect(children[headingIndex + 1].textContent).toContain('Erste Inbox-Nachricht.');
        });

        it('does not fetch twice while the aside stays open, but refetches after reopening', () => {
            // Act
            asideService.show();
            fixture.detectChanges();
            fixture.detectChanges();

            // Assert
            expect(mockProactiveInboxService.loadUnreadMessages).toHaveBeenCalledTimes(1);

            // Act
            asideService.hide();
            fixture.detectChanges();
            asideService.show();
            fixture.detectChanges();

            // Assert
            expect(mockProactiveInboxService.loadUnreadMessages).toHaveBeenCalledTimes(2);
        });

        it('shows no heading and skips read-all when there is nothing unread', () => {
            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            expect(component.inboxHeadingMessageId()).toBeNull();
            expect(mockProactiveInboxService.markAllRead).not.toHaveBeenCalled();
        });

        it('does not duplicate an entry already shown via live push but still marks it read', () => {
            // Arrange
            signalRService.proactiveMessage$.next({
                messageId: 'inbox-dup',
                content: 'Eine Periode ist überfällig.',
                timestamp: new Date().toISOString(),
                messageType: 'proactive',
            });
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(of([inboxItem({ id: 'inbox-dup' })]));

            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            expect(component.messages.filter((m) => m.id === 'inbox-dup').length).toBe(1);
            expect(component.inboxHeadingMessageId()).toBeNull();
            expect(mockProactiveInboxService.markAllRead).toHaveBeenCalledTimes(1);
        });

        it('locks the reaction buttons for entries the user already reacted to', () => {
            // Arrange
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(
                of([inboxItem({ id: 'inbox-reacted', reaction: 'Helpful' })]),
            );

            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            const message = component.messages.find((m) => m.id === 'inbox-reacted')!;
            expect(message.proactiveReaction).toBe(PROACTIVE_REACTION.Helpful);
        });

        it('sends reactions for inbox entries with the row id like for live messages', async () => {
            // Arrange
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(of([inboxItem({ id: 'inbox-react' })]));
            asideService.show();
            fixture.detectChanges();
            const message = component.messages.find((m) => m.id === 'inbox-react')!;

            // Act
            await component.submitProactiveReaction(message, PROACTIVE_REACTION.Helpful);

            // Assert
            expect(mockLlmService.setProactiveReaction).toHaveBeenCalledWith(
                'inbox-react',
                PROACTIVE_REACTION.Helpful,
            );
        });

        it('does not load the inbox while the setup tour is active', () => {
            // Arrange
            const onboarding = TestBed.inject(OnboardingService);
            onboarding.applyWelcome({ shouldOffer: false, showCard: true, status: 'in_progress', completedStations: [] });
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(of([inboxItem()]));

            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            expect(mockProactiveInboxService.loadUnreadMessages).not.toHaveBeenCalled();
        });

        it('resolves i18n marker content for inbox entries', () => {
            // Arrange
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(
                of([inboxItem({ id: 'inbox-i18n', content: 'i18n:assistant-chat.proactive.curiosity.sport' })]),
            );

            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            expect(mockTranslateService.instant).toHaveBeenCalledWith(
                'assistant-chat.proactive.curiosity.sport',
                {},
            );
        });

        it('hides the inbox heading again when the chat is cleared', () => {
            // Arrange
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(of([inboxItem()]));
            asideService.show();
            fixture.detectChanges();
            expect(component.inboxHeadingMessageId()).toBe('inbox-1');

            // Act
            component.clearChat();

            // Assert
            expect(component.inboxHeadingMessageId()).toBeNull();
        });
    });

    describe('proactive one-click action and mute suggestion (phases 4+5)', () => {
        let signalRService: AssistantSignalRService;
        let navigationService: KlacksyNavigationService;

        const proactiveWithAction = (overrides: Partial<IProactiveMessage> = {}): IProactiveMessage => ({
            messageId: 'proactive-action-1',
            content: 'Eine Schicht am 2026-08-03 ist noch unbesetzt.',
            timestamp: new Date().toISOString(),
            messageType: 'proactive',
            kind: 'unstaffed_shift',
            actionRoute: '/workplace/schedule',
            actionParams: { groupId: 'g-1', period: '2026-08' },
            ...overrides,
        });

        const muteSuggestion = (overrides: Partial<IProactiveMessage> = {}): IProactiveMessage => ({
            messageId: 'mute-suggestion-1',
            content: 'i18n:assistant.proactive.muteSuggestion',
            timestamp: new Date().toISOString(),
            messageType: 'proactive',
            kind: PROACTIVE_TRIGGER_KIND.MuteSuggestion,
            contentParams: { kind: 'unstaffed_shift' },
            actionRoute: null,
            actionParams: null,
            ...overrides,
        });

        beforeEach(() => {
            fixture.detectChanges();
            signalRService = TestBed.inject(AssistantSignalRService);
            navigationService = TestBed.inject(KlacksyNavigationService);
            vi.spyOn(navigationService, 'navigateAndScroll').mockResolvedValue({ success: true });
        });

        it('navigates to the action route with query params and keeps the aside open', () => {
            // Arrange
            const asideService = TestBed.inject(AsideService);
            asideService.show();
            fixture.detectChanges();
            signalRService.proactiveMessage$.next(proactiveWithAction());
            fixture.detectChanges();

            // Act
            const actionButton: HTMLButtonElement = fixture.nativeElement.querySelector('.proactive-action-btn');
            expect(actionButton).toBeTruthy();
            actionButton.click();

            // Assert
            expect(navigationService.navigateAndScroll).toHaveBeenCalledWith(
                '/workplace/schedule?groupId=g-1&period=2026-08',
            );
            expect(asideService.isVisible()).toBe(true);
            asideService.hide();
        });

        it('navigates without a query string when the action has no params', () => {
            // Arrange
            signalRService.proactiveMessage$.next(
                proactiveWithAction({ messageId: 'proactive-action-2', actionParams: null }),
            );
            const message = component.messages.find((m) => m.id === 'proactive-action-2')!;

            // Act
            component.onProactiveActionClick(message);

            // Assert
            expect(navigationService.navigateAndScroll).toHaveBeenCalledWith('/workplace/schedule');
        });

        it('renders the show-me button only for proactive messages carrying an action route', () => {
            // Arrange
            signalRService.proactiveMessage$.next(proactiveWithAction());
            signalRService.proactiveMessage$.next({
                messageId: 'proactive-no-action',
                content: 'Eine Periode ist überfällig.',
                timestamp: new Date().toISOString(),
                messageType: 'proactive',
            });

            // Act
            fixture.detectChanges();

            // Assert
            const actionButtons = fixture.nativeElement.querySelectorAll('.proactive-action-btn');
            expect(actionButtons.length).toBe(1);
        });

        it('renders the mute button instead of the reaction pair for mute suggestions', () => {
            // Arrange
            signalRService.proactiveMessage$.next(muteSuggestion());

            // Act
            fixture.detectChanges();

            // Assert
            const muteButtons = fixture.nativeElement.querySelectorAll('.proactive-mute-btn');
            expect(muteButtons.length).toBe(1);
            const reactionButtons = fixture.nativeElement.querySelectorAll(
                '.proactive-reactions .proactive-reaction-btn:not(.proactive-mute-btn)',
            );
            expect(reactionButtons.length).toBe(0);
        });

        it('mutes the suggested kind from the content params, locks the button and confirms via toast', async () => {
            // Arrange
            const toastService = TestBed.inject(ToastShowService);
            const showInfoSpy = vi.spyOn(toastService, 'showInfo');
            signalRService.proactiveMessage$.next(muteSuggestion());
            const appended = component.messages.find((m) => m.id === 'mute-suggestion-1')!;

            // Act
            await component.submitMuteSuggestion(appended);

            // Assert
            expect(mockLlmService.muteTriggerKind).toHaveBeenCalledWith('unstaffed_shift');
            const updated = component.messages.find((m) => m.id === 'mute-suggestion-1')!;
            expect(updated.proactiveMuted).toBe(true);
            expect(component.pendingMuteMessageId()).toBeNull();
            expect(showInfoSpy).toHaveBeenCalled();
            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.proactive.mute-confirmed');

            // Act again on the already-muted message
            await component.submitMuteSuggestion(updated);

            // Assert: locked, no second call
            expect(mockLlmService.muteTriggerKind).toHaveBeenCalledTimes(1);
        });

        it('ignores a second click while a mute request is still pending', async () => {
            // Arrange
            const request$ = new Subject<void>();
            mockLlmService.muteTriggerKind.mockReturnValue(request$.asObservable());
            signalRService.proactiveMessage$.next(muteSuggestion({ messageId: 'mute-suggestion-pending' }));
            const appended = component.messages.find((m) => m.id === 'mute-suggestion-pending')!;

            // Act
            const firstCall = component.submitMuteSuggestion(appended);
            expect(component.pendingMuteMessageId()).toBe('mute-suggestion-pending');
            await component.submitMuteSuggestion(appended);

            // Assert
            expect(mockLlmService.muteTriggerKind).toHaveBeenCalledTimes(1);

            request$.next();
            request$.complete();
            await firstCall;
            expect(component.pendingMuteMessageId()).toBeNull();
        });

        it('shows an error toast and keeps the mute button active for a retry when the PUT fails', async () => {
            // Arrange
            mockLlmService.muteTriggerKind.mockReturnValue(throwError(() => new Error('offline')));
            const toastService = TestBed.inject(ToastShowService);
            const showErrorSpy = vi.spyOn(toastService, 'showError');
            signalRService.proactiveMessage$.next(muteSuggestion({ messageId: 'mute-suggestion-error' }));
            const appended = component.messages.find((m) => m.id === 'mute-suggestion-error')!;

            // Act
            await component.submitMuteSuggestion(appended);

            // Assert
            expect(showErrorSpy).toHaveBeenCalled();
            expect(mockTranslateService.instant).toHaveBeenCalledWith('assistant-chat.error.generic');
            expect(
                component.messages.find((m) => m.id === 'mute-suggestion-error')?.proactiveMuted,
            ).toBeUndefined();
            expect(component.pendingMuteMessageId()).toBeNull();

            // Act: retry succeeds after the transient failure
            mockLlmService.muteTriggerKind.mockReturnValue(of({ triggerKind: 'unstaffed_shift', muted: true }));
            const current = component.messages.find((m) => m.id === 'mute-suggestion-error')!;
            await component.submitMuteSuggestion(current);

            // Assert
            expect(
                component.messages.find((m) => m.id === 'mute-suggestion-error')?.proactiveMuted,
            ).toBe(true);
        });

        it('does not send a mute request when the target kind is missing from the content params', async () => {
            // Arrange
            signalRService.proactiveMessage$.next(
                muteSuggestion({ messageId: 'mute-suggestion-no-target', contentParams: {} }),
            );
            const appended = component.messages.find((m) => m.id === 'mute-suggestion-no-target')!;

            // Act
            await component.submitMuteSuggestion(appended);

            // Assert
            expect(mockLlmService.muteTriggerKind).not.toHaveBeenCalled();
        });

        it('maps kind, action route and params for inbox items and renders the action button', () => {
            // Arrange
            const asideService = TestBed.inject(AsideService);
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(
                of([
                    {
                        id: 'inbox-action-1',
                        content: 'Eine Schicht ist unbesetzt.',
                        contentParams: {},
                        severity: 'high',
                        reaction: null,
                        createdUtc: '2026-07-24T06:00:00Z',
                        readAtUtc: null,
                        kind: 'unstaffed_shift',
                        actionRoute: '/workplace/schedule',
                        actionParams: { groupId: 'g-9' },
                    } satisfies IProactiveInboxItem,
                ]),
            );

            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            const message = component.messages.find((m) => m.id === 'inbox-action-1')!;
            expect(message.proactiveKind).toBe('unstaffed_shift');
            expect(message.proactiveActionRoute).toBe('/workplace/schedule');
            expect(message.proactiveActionParams).toEqual({ groupId: 'g-9' });
            const actionButtons = fixture.nativeElement.querySelectorAll('.proactive-action-btn');
            expect(actionButtons.length).toBe(1);
            asideService.hide();
        });

        it('maps the mute target kind for inbox mute suggestions and renders the mute button', () => {
            // Arrange
            const asideService = TestBed.inject(AsideService);
            mockProactiveInboxService.loadUnreadMessages.mockReturnValue(
                of([
                    {
                        id: 'inbox-mute-1',
                        content: 'i18n:assistant.proactive.muteSuggestion',
                        contentParams: { kind: 'period_overdue' },
                        severity: 'low',
                        reaction: null,
                        createdUtc: '2026-07-24T06:00:00Z',
                        readAtUtc: null,
                        kind: PROACTIVE_TRIGGER_KIND.MuteSuggestion,
                        actionRoute: null,
                        actionParams: null,
                    } satisfies IProactiveInboxItem,
                ]),
            );

            // Act
            asideService.show();
            fixture.detectChanges();

            // Assert
            const message = component.messages.find((m) => m.id === 'inbox-mute-1')!;
            expect(message.proactiveMuteTargetKind).toBe('period_overdue');
            const muteButtons = fixture.nativeElement.querySelectorAll('.proactive-mute-btn');
            expect(muteButtons.length).toBe(1);
            asideService.hide();
        });
    });
});

