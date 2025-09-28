/* eslint-disable @typescript-eslint/no-unused-vars */
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { DataManagementLLMService } from './data-management-llm.service';
import {
  DataLLMService,
  ILLMModel,
  ILLMChatResponse,
  ILLMUsage,
} from 'src/app/infrastructure/api/data-llm.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

describe('DataManagementLLMService', () => {
  let service: DataManagementLLMService;
  let mockDataLLMService: jasmine.SpyObj<DataLLMService>;
  let mockToastService: jasmine.SpyObj<ToastShowService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

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
    const dataLLMServiceSpy = jasmine.createSpyObj('DataLLMService', [
      'getModels',
      'chat',
      'enableModel',
      'disableModel',
      'setDefaultModel',
      'getUsage',
      'getHelp',
      'getFunctions',
      'createModel',
      'deleteModel',
      'updateModel',
    ]);

    const toastServiceSpy = jasmine.createSpyObj('ToastShowService', [
      'showError',
      'showSuccess',
    ]);

    const translateServiceSpy = jasmine.createSpyObj(
      'TranslateService',
      ['instant', 'get'],
      {
        currentLang: 'de',
      }
    );

    translateServiceSpy.get.and.returnValue(of('Translated text'));

    TestBed.configureTestingModule({
      providers: [
        DataManagementLLMService,
        { provide: DataLLMService, useValue: dataLLMServiceSpy },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    });

    service = TestBed.inject(DataManagementLLMService);
    mockDataLLMService = TestBed.inject(
      DataLLMService
    ) as jasmine.SpyObj<DataLLMService>;
    mockToastService = TestBed.inject(
      ToastShowService
    ) as jasmine.SpyObj<ToastShowService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    mockDataLLMService.getModels.and.returnValue(of(mockModels));
    // Default mock for chat method to prevent undefined.pipe() errors
    mockDataLLMService.chat.and.returnValue(
      of({
        message: 'Default response',
        conversationId: 'default-conv',
      })
    );
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
      mockDataLLMService.getModels.and.returnValue(
        throwError(() => new Error('API Error'))
      );

      // Act
      service.initializeLLMModels();

      // Assert
      expect(mockToastService.showError).toHaveBeenCalledWith(
        'settings.llm-models.error.load'
      );

      service.getAvailableModels().subscribe((models) => {
        expect(models).toEqual([]);
      });
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      service.initializeLLMModels();
    });

    it('should send message and create conversation', (done) => {
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
      mockDataLLMService.chat.and.returnValue(of(mockResponse));

      // Act
      service.sendMessage('Hello', 'conv-123').subscribe((response) => {
        // Assert
        expect(response).toEqual(mockResponse);
        expect(mockDataLLMService.chat).toHaveBeenCalled();

        const conversation = service.getConversation('conv-123');
        expect(conversation).toBeTruthy();
        expect(conversation!.messages.length).toBe(2); // User + Assistant
        expect(conversation!.totalCost).toBe(0.001);

        done();
      });
    });

    it('should return error when no model selected', (done) => {
      // Arrange
      mockDataLLMService.getModels.and.returnValue(of([])); // No models
      service.initializeLLMModels();

      // Wait for initialization to complete, then test
      setTimeout(() => {
        // Act
        service.sendMessage('Hello').subscribe({
          next: () => {
            done.fail('Should have failed with no model selected');
          },
          error: (error) => {
            // Assert
            expect(error.message).toContain('Please select a model first');
            done();
          },
        });
      }, 50);
    });

    it('should handle chat error', (done) => {
      // Arrange
      service.initializeLLMModels(); // Ensure models are loaded
      setTimeout(() => {
        mockDataLLMService.chat.and.returnValue(
          throwError(() => new Error('Chat failed'))
        );

        // Act
        service.sendMessage('Hello').subscribe({
          next: () => {
            done.fail('Should have failed with chat error');
          },
          error: (error) => {
            // Assert
            expect(mockToastService.showError).toHaveBeenCalledWith(
              'settings.llm-models.error.communication'
            );
            expect(service.showProgressSpinner()).toBe(false);
            done();
          },
        });
      }, 50);
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

    it('should enable model', (done) => {
      // Arrange
      mockDataLLMService.enableModel.and.returnValue(of({}));

      // Act
      service.enableModel('claude-3').subscribe(() => {
        // Assert
        expect(mockDataLLMService.enableModel).toHaveBeenCalledWith('claude-3');
        expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
        done();
      });
    });

    it('should disable model', (done) => {
      // Arrange
      mockDataLLMService.disableModel.and.returnValue(of({}));

      // Act
      service.disableModel('gpt-4').subscribe(() => {
        // Assert
        expect(mockDataLLMService.disableModel).toHaveBeenCalledWith('gpt-4');
        expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
        done();
      });
    });

    it('should set default model', (done) => {
      // Arrange
      mockDataLLMService.setDefaultModel.and.returnValue(of({}));

      // Act
      service.setDefaultModel('claude-3').subscribe(() => {
        // Assert
        expect(mockDataLLMService.setDefaultModel).toHaveBeenCalledWith(
          'claude-3'
        );
        expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
        done();
      });
    });

    it('should create model', (done) => {
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
      mockDataLLMService.createModel.and.returnValue(of(newModel));

      // Act
      service.createModel(newModel).subscribe((result) => {
        // Assert
        expect(mockDataLLMService.createModel).toHaveBeenCalledWith(newModel);
        expect(result).toEqual(newModel);
        done();
      });
    });

    it('should delete model', (done) => {
      // Arrange
      mockDataLLMService.deleteModel.and.returnValue(of({}));

      // Act
      service.deleteModel('1').subscribe(() => {
        // Assert
        expect(mockDataLLMService.deleteModel).toHaveBeenCalledWith('1');
        expect(mockDataLLMService.getModels).toHaveBeenCalled(); // Reinitialize
        done();
      });
    });

    it('should update model', (done) => {
      // Arrange
      const updatedModel = { ...mockModels[0], maxTokens: 16000 };
      mockDataLLMService.updateModel.and.returnValue(of(updatedModel));

      // Act
      service.updateModel(updatedModel).subscribe((result) => {
        // Assert
        expect(mockDataLLMService.updateModel).toHaveBeenCalledWith(
          '1',
          updatedModel
        );
        expect(result).toEqual(updatedModel);
        done();
      });
    });

    it('should throw error when updating model without ID', (done) => {
      // Arrange
      const modelWithoutId = { ...mockModels[0] };
      delete modelWithoutId.id;

      // Act
      service.updateModel(modelWithoutId).subscribe({
        error: (error) => {
          // Assert
          expect(error.message).toContain('Model ID is required for update');
          done();
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
      mockDataLLMService.chat.and.returnValue(of(mockResponse));

      // Act
      service.sendMessage('Hello', 'conv-1').subscribe();
      service.sendMessage('Hello', 'conv-2').subscribe();

      // Assert
      const ids = service.getConversationIds();
      expect(ids).toContain('conv-1');
      expect(ids).toContain('conv-2');
    });

    it('should get all conversations sorted by last activity', (done) => {
      // Arrange
      const mockResponse: ILLMChatResponse = {
        message: 'Response',
        conversationId: 'conv-123',
      };
      mockDataLLMService.chat.and.returnValue(of(mockResponse));

      // Act
      service.sendMessage('Hello 1', 'conv-1').subscribe({
        next: () => {
          setTimeout(() => {
            service.sendMessage('Hello 2', 'conv-2').subscribe({
              next: () => {
                // Assert
                setTimeout(() => {
                  const conversations = service.getAllConversations();
                  expect(conversations.length).toBe(2);
                  // Should be sorted by last activity (most recent first)
                  expect(conversations[0].id).toBe('conv-2');
                  done();
                }, 50);
              },
            });
          }, 50);
        },
      });
    });
  });

  describe('usage and statistics', () => {
    it('should get usage statistics', (done) => {
      // Arrange
      const mockUsage: ILLMUsage = {
        totalCost: 15.5,
        totalInputTokens: 10000,
        totalOutputTokens: 8000,
        conversationCount: 50,
        modelBreakdown: [],
      };
      mockDataLLMService.getUsage.and.returnValue(of(mockUsage));

      // Act
      service.getUsageStatistics(7).subscribe((usage) => {
        // Assert
        expect(mockDataLLMService.getUsage).toHaveBeenCalledWith(7);
        expect(usage).toEqual(mockUsage);
        done();
      });
    });

    it('should handle usage statistics error', (done) => {
      // Arrange
      mockDataLLMService.getUsage.and.returnValue(
        throwError(() => new Error('Failed'))
      );

      // Act
      service.getUsageStatistics().subscribe((usage) => {
        // Assert
        expect(usage.totalCost).toBe(0);
        expect(usage.modelBreakdown).toEqual([]);
        done();
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

    it('should get help information', (done) => {
      // Arrange
      const mockHelp = {
        description: 'AI Assistant',
        examples: [],
        availableFunctions: [],
        tips: [],
      };
      mockDataLLMService.getHelp.and.returnValue(of(mockHelp));

      // Act
      service.getHelp().subscribe((help) => {
        // Assert
        expect(help).toEqual(mockHelp);
        done();
      });
    });

    it('should get functions', (done) => {
      // Arrange
      const mockFunctions = [
        {
          name: 'search',
          description: 'Search function',
          parameters: { type: 'object', properties: {} },
          isAvailable: true,
        },
      ];
      mockDataLLMService.getFunctions.and.returnValue(of(mockFunctions));

      // Act
      service.getFunctions().subscribe((functions) => {
        // Assert
        expect(functions).toEqual(mockFunctions);
        done();
      });
    });
  });

  describe('loading state', () => {
    it('should track loading state', (done) => {
      // Arrange
      service.initializeLLMModels();
      const mockResponse: ILLMChatResponse = {
        message: 'Response',
        conversationId: 'conv-123',
      };

      const loadingStates: boolean[] = [];

      service.isLoading().subscribe((loading) => {
        loadingStates.push(loading);
      });

      mockDataLLMService.chat.and.returnValue(of(mockResponse));

      // Act
      service.sendMessage('Hello').subscribe(() => {
        // Assert
        expect(loadingStates).toContain(true); // Started loading
        expect(loadingStates).toContain(false); // Finished loading
        done();
      });
    });
  });

  describe('reload functionality', () => {
    it('should reload models', () => {
      // Arrange
      mockDataLLMService.getModels.calls.reset();

      // Act
      service.reloadModels();

      // Assert
      expect(mockDataLLMService.getModels).toHaveBeenCalled();
    });
  });
});
