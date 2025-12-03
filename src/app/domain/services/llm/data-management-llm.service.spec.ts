/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError, delay } from 'rxjs';

import { DataManagementLLMService } from './data-management-llm.service';
import { DataLLMService, ILLMModel, ILLMChatResponse, ILLMUsage, } from 'src/app/infrastructure/api/data-llm.service';
import { IEventBus, EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { LLMFunctionExecutionService } from './llm-function-execution.service';
import { LLMSystemContextService } from './llm-system-context.service';

describe('DataManagementLLMService', () => {
    let service: DataManagementLLMService;
    let mockDataLLMService: any;
    let mockEventBus: any;
    let mockTranslateService: any;
    let mockFunctionExecutionService: any;
    let mockSystemContextService: any;

    const mockModels: ILLMModel[] = [
        {
            id: '1',
            modelId: 'gpt-4',
            modelName: 'GPT-4',
            providerId: 'openai',
            contextWindow: 32000,
            maxTokens: 8000,
            costPerInputToken: 0.01,
            costPerOutputToken: 0.03,
            isEnabled: true,
            isDefault: true,
            capabilities: ['text', 'function-calling'],
        },
        {
            id: '2',
            modelId: 'claude-3',
            modelName: 'Claude 3',
            providerId: 'anthropic',
            contextWindow: 200000,
            maxTokens: 4000,
            costPerInputToken: 0.008,
            costPerOutputToken: 0.024,
            isEnabled: false,
            isDefault: false,
            capabilities: ['text'],
        },
    ];

    beforeEach(() => {
        const dataLLMServiceSpy = {
            getModels: vi.fn(),
            chat: vi.fn(),
            enableModel: vi.fn(),
            disableModel: vi.fn(),
            setDefaultModel: vi.fn(),
            getUsage: vi.fn(),
            getHelp: vi.fn(),
            getFunctions: vi.fn(),
            createModel: vi.fn(),
            deleteModel: vi.fn(),
            updateModel: vi.fn()
        };

        const eventBusSpy = {
            emit: vi.fn(),
            on: vi.fn(),
            onAny: vi.fn()
        };

        const translateServiceSpy = {
            instant: vi.fn(),
            get: vi.fn(),
            currentLang: 'de'
        };

        const functionExecutionServiceSpy = {
            executeFunction: vi.fn(),
            executeFunctions: vi.fn()
        };
        functionExecutionServiceSpy.executeFunction.mockReturnValue(of({ success: true }));
        functionExecutionServiceSpy.executeFunctions.mockReturnValue(of([]));

        const systemContextServiceSpy = {
            getSystemContext: vi.fn(),
            formatSystemMessage: vi.fn(),
            getToolsForLLM: vi.fn()
        };
        systemContextServiceSpy.getSystemContext.mockReturnValue({
            systemPrompt: 'Test prompt',
            capabilities: [],
            availableTools: [],
            examples: [],
            currentContext: {}
        });
        systemContextServiceSpy.formatSystemMessage.mockReturnValue('System message');
        systemContextServiceSpy.getToolsForLLM.mockReturnValue([]);

        translateServiceSpy.get.mockReturnValue(of('Translated text'));

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                DataManagementLLMService,
                { provide: DataLLMService, useValue: dataLLMServiceSpy },
                { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
                { provide: TranslateService, useValue: translateServiceSpy },
                { provide: LLMFunctionExecutionService, useValue: functionExecutionServiceSpy },
                { provide: LLMSystemContextService, useValue: systemContextServiceSpy },
            ],
        });

        service = TestBed.inject(DataManagementLLMService);
        mockDataLLMService = TestBed.inject(DataLLMService) as any;
        mockEventBus = TestBed.inject(EVENT_BUS_TOKEN) as any;
        mockTranslateService = TestBed.inject(TranslateService) as any;
        mockFunctionExecutionService = TestBed.inject(LLMFunctionExecutionService) as any;
        mockSystemContextService = TestBed.inject(LLMSystemContextService) as any;

        mockDataLLMService.getModels.mockReturnValue(of(mockModels));
        // Default mock for chat method to prevent undefined.pipe() errors
        mockDataLLMService.chat.mockReturnValue(of({
            message: 'Default response',
            conversationId: 'default-conv',
        }));
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('initialization', () => {
        it('should initialize models on startup', () => {
            // Act
            service.initializeLLMModels();

            // Assert
            expect(mockDataLLMService.getModels).toHaveBeenCalled();

            service.getAvailableModels().subscribe((models) => {
                expect(models).toEqual(mockModels);
            });
        });

        it('should set default model from enabled models', () => {
            // Act
            service.initializeLLMModels();

            // Assert
            service.getCurrentModelId().subscribe((modelId) => {
                expect(modelId).toBe('gpt-4'); // Default enabled model
            });
        });

        it('should handle model loading error', () => {
            // Arrange
            mockDataLLMService.getModels.mockReturnValue(throwError(() => new Error('API Error')));

            // Act
            service.initializeLLMModels();

            // Assert
            expect(mockEventBus.emit).toHaveBeenCalled();

            service.getAvailableModels().subscribe((models) => {
                expect(models).toEqual([]);
            });
        });
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            service.initializeLLMModels();
        });

        it('should send message and create conversation', async () => {
            // Arrange
            const mockResponse: ILLMChatResponse = {
                message: 'Hello back!',
                conversationId: 'conv-123',
                suggestions: ['How can I help?'],
                usage: {
                    inputTokens: 10,
                    outputTokens: 15,
                    totalTokens: 25,
                    cost: 0.001,
                },
            };
            mockDataLLMService.chat.mockReturnValue(of(mockResponse));

            // Act
            service.sendMessage('Hello', 'conv-123').subscribe((response) => {
                // Assert
                expect(response).toEqual(mockResponse);
                expect(mockDataLLMService.chat).toHaveBeenCalled();

                const conversation = service.getConversation('conv-123');
                expect(conversation).toBeTruthy();
                expect(conversation!.messages.length).toBeGreaterThanOrEqual(2); // At least User + Assistant
                expect(conversation!.totalCost).toBe(0.001);

                ;
            });
        });

        it('should return error when no model selected', async () => {
            // Arrange
            mockDataLLMService.getModels.mockReturnValue(of([])); // No models
            service.initializeLLMModels();

            await new Promise(resolve => setTimeout(resolve, 60));
            // Act
            service.sendMessage('Hello').subscribe({
                next: () => {
                    throw new Error('Should have failed with no model selected');
                },
                error: (error) => {
                    // Assert
                    expect(error.message).toContain('Please select a model first');
                },
            });
        });

        it('should handle chat error', async () => {
            // Arrange
            service.initializeLLMModels(); // Ensure models are loaded
            await new Promise(resolve => setTimeout(resolve, 60));
            mockDataLLMService.chat.mockReturnValue(throwError(() => new Error('Chat failed')));

            // Act
            service.sendMessage('Hello').subscribe({
                next: () => {
                    throw new Error('Should have failed with chat error');
                },
                error: (error) => {
                    // Assert
                    expect(mockEventBus.emit).toHaveBeenCalled();
                    expect(service.isLoading()).toBe(false);
                },
            });
        });
    });

    describe('model management', () => {
        beforeEach(() => {
            service.initializeLLMModels();
        });

        it('should set current model', () => {
            // Act
            service.setCurrentModel('gpt-4');

            // Assert
            service.getCurrentModelId().subscribe((modelId) => {
                expect(modelId).toBe('gpt-4');
            });
        });

        it('should not set disabled model as current', () => {
            // Act
            service.setCurrentModel('claude-3'); // Disabled model

            // Assert
            service.getCurrentModelId().subscribe((modelId) => {
                expect(modelId).toBe('gpt-4'); // Should remain previous selection
            });
        });

        it('should get model info', () => {
            // Act
            const modelInfo = service.getModelInfo('gpt-4');

            // Assert
            expect(modelInfo).toEqual(mockModels[0]);
        });

        it('should get default model', () => {
            // Act
            const defaultModel = service.getDefaultModel();

            // Assert
            expect(defaultModel).toEqual(mockModels[0]);
        });

        it('should enable model', async () => {
            // Arrange
            mockDataLLMService.enableModel.mockReturnValue(of({}));

            // Act
            service.enableModel('claude-3').subscribe(() => {
                // Assert
                expect(mockDataLLMService.enableModel).toHaveBeenCalledWith('claude-3');
                expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
                ;
            });
        });

        it('should disable model', async () => {
            // Arrange
            mockDataLLMService.disableModel.mockReturnValue(of({}));

            // Act
            service.disableModel('gpt-4').subscribe(() => {
                // Assert
                expect(mockDataLLMService.disableModel).toHaveBeenCalledWith('gpt-4');
                expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
                ;
            });
        });

        it('should set default model', async () => {
            // Arrange
            mockDataLLMService.setDefaultModel.mockReturnValue(of({}));

            // Act
            service.setDefaultModel('claude-3').subscribe(() => {
                // Assert
                expect(mockDataLLMService.setDefaultModel).toHaveBeenCalledWith('claude-3');
                expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
                ;
            });
        });

        it('should create model', async () => {
            // Arrange
            const newModel: ILLMModel = {
                modelId: 'new-model',
                modelName: 'New Model',
                providerId: 'test',
                contextWindow: 8000,
                maxTokens: 2000,
                costPerInputToken: 0.01,
                costPerOutputToken: 0.02,
                isEnabled: true,
                isDefault: false,
                capabilities: ['text'],
            };
            mockDataLLMService.createModel.mockReturnValue(of(newModel));

            // Act
            service.createModel(newModel).subscribe((result) => {
                // Assert
                expect(mockDataLLMService.createModel).toHaveBeenCalledWith(newModel);
                expect(result).toEqual(newModel);
                ;
            });
        });

        it('should delete model', async () => {
            // Arrange
            mockDataLLMService.deleteModel.mockReturnValue(of({}));

            // Act
            service.deleteModel('1').subscribe(() => {
                // Assert
                expect(mockDataLLMService.deleteModel).toHaveBeenCalledWith('1');
                expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
                ;
            });
        });

        it('should update model', async () => {
            // Arrange
            const updatedModel = { ...mockModels[0], maxTokens: 16000 };
            mockDataLLMService.updateModel.mockReturnValue(of(updatedModel));

            // Act
            service.updateModel(updatedModel).subscribe((result) => {
                // Assert
                expect(mockDataLLMService.updateModel).toHaveBeenCalledWith('1', updatedModel);
                expect(result).toEqual(updatedModel);
                ;
            });
        });

        it('should throw error when updating model without ID', async () => {
            // Arrange
            const modelWithoutId = { ...mockModels[0] };
            delete modelWithoutId.id;

            // Act
            service.updateModel(modelWithoutId).subscribe({
                error: (error) => {
                    // Assert
                    expect(error.message).toContain('Model ID is required for update');
                    ;
                },
            });
        });
    });

    describe('conversation management', () => {
        beforeEach(() => {
            service.initializeLLMModels();
        });

        it('should clear specific conversation', () => {
            // Arrange
            const conversationId = 'conv-123';
            service.sendMessage('Hello', conversationId).subscribe();

            // Act
            service.clearConversation(conversationId);

            // Assert
            const conversation = service.getConversation(conversationId);
            expect(conversation).toBeUndefined();
        });

        it('should clear all conversations', () => {
            // Arrange
            service.sendMessage('Hello 1', 'conv-1').subscribe();
            service.sendMessage('Hello 2', 'conv-2').subscribe();

            // Act
            service.clearAllConversations();

            // Assert
            expect(service.getConversationIds()).toEqual([]);
            expect(service.getAllConversations()).toEqual([]);
        });

        it('should get conversation IDs', () => {
            // Arrange
            const mockResponse: ILLMChatResponse = {
                message: 'Response',
                conversationId: 'conv-123',
            };
            mockDataLLMService.chat.mockReturnValue(of(mockResponse));

            // Act
            service.sendMessage('Hello', 'conv-1').subscribe();
            service.sendMessage('Hello', 'conv-2').subscribe();

            // Assert
            const ids = service.getConversationIds();
            expect(ids).toContain('conv-1');
            expect(ids).toContain('conv-2');
        });

        it('should get all conversations sorted by last activity', async () => {
            // Arrange
            const mockResponse: ILLMChatResponse = {
                message: 'Response',
                conversationId: 'conv-123',
            };
            mockDataLLMService.chat.mockReturnValue(of(mockResponse));

            // Act
            service.sendMessage('Hello 1', 'conv-1').subscribe({
                next: async () => {
                    await new Promise(resolve => setTimeout(resolve, 60));
                    service.sendMessage('Hello 2', 'conv-2').subscribe({
                        next: async () => {
                            // Assert
                            await new Promise(resolve => setTimeout(resolve, 60));
                            const conversations = service.getAllConversations();
                            expect(conversations.length).toBe(2);
                            // Should be sorted by last activity (most recent first)
                            expect(conversations[0].id).toBe('conv-2');
                        },
                    });
                },
            });
        });
    });

    describe('usage and statistics', () => {
        it('should get usage statistics', async () => {
            // Arrange
            const mockUsage: ILLMUsage = {
                totalCost: 15.5,
                totalInputTokens: 10000,
                totalOutputTokens: 8000,
                conversationCount: 50,
                modelBreakdown: [],
            };
            mockDataLLMService.getUsage.mockReturnValue(of(mockUsage));

            // Act
            service.getUsageStatistics(7).subscribe((usage) => {
                // Assert
                expect(mockDataLLMService.getUsage).toHaveBeenCalledWith(7);
                expect(usage).toEqual(mockUsage);
                ;
            });
        });

        it('should handle usage statistics error', async () => {
            // Arrange
            mockDataLLMService.getUsage.mockReturnValue(throwError(() => new Error('Failed')));

            // Act
            service.getUsageStatistics().subscribe((usage) => {
                // Assert
                expect(usage.totalCost).toBe(0);
                expect(usage.modelBreakdown).toEqual([]);
                ;
            });
        });
    });

    describe('language and context', () => {
        it('should set language', () => {
            // Act
            service.setLanguage('en');

            // Assert
            service.getCurrentLanguage().subscribe((lang) => {
                expect(lang).toBe('en');
            });
        });

        it('should get help information', async () => {
            // Arrange
            const mockHelp = {
                description: 'AI Assistant',
                examples: [],
                availableFunctions: [],
                tips: [],
            };
            mockDataLLMService.getHelp.mockReturnValue(of(mockHelp));

            // Act
            service.getHelp().subscribe((help) => {
                // Assert
                expect(help).toEqual(mockHelp);
                ;
            });
        });

        it('should get functions', async () => {
            // Arrange
            const mockFunctions = [
                {
                    name: 'search',
                    description: 'Search function',
                    parameters: { type: 'object', properties: {} },
                    isAvailable: true,
                },
            ];
            mockDataLLMService.getFunctions.mockReturnValue(of(mockFunctions));

            // Act
            service.getFunctions().subscribe((functions) => {
                // Assert
                expect(functions).toEqual(mockFunctions);
                ;
            });
        });
    });

    describe('loading state', () => {
        it('should track loading state', async () => {
            // Arrange
            service.initializeLLMModels();
            const mockResponse: ILLMChatResponse = {
                message: 'Response',
                conversationId: 'conv-123',
            };

            const loadingStates: boolean[] = [];

            // Subscribe to loading state
            const sub = service.isLoadingObservable().subscribe((loading) => {
                loadingStates.push(loading);
            });

            // Use a delayed observable to simulate async API call
            // This ensures signal changes have time to propagate
            mockDataLLMService.chat.mockReturnValue(of(mockResponse).pipe(delay(50)));

            await new Promise(resolve => setTimeout(resolve, 60));
            // Act
            service.sendMessage('Hello').subscribe({
                next: async () => {
                    // Assert - wait for all state changes to complete
                    await new Promise(resolve => setTimeout(resolve, 110));
                    expect(loadingStates.length).toBeGreaterThanOrEqual(2);
                    expect(loadingStates).toContain(true); // Started loading
                    expect(loadingStates).toContain(false); // Finished loading
                    sub.unsubscribe();
                },
                error: (err) => {
                    sub.unsubscribe();
                    throw new Error(err);
                }
            });
        });
    });

    describe('reload functionality', () => {
        it('should reload models', () => {
            // Arrange
            mockDataLLMService.getModels.mockClear();

            // Act
            service.reloadModels();

            // Assert
            expect(mockDataLLMService.getModels).toHaveBeenCalled();
        });
    });
});
