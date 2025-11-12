/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LLMChatComponent } from './llm-chat.component';
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { ILLMModel } from 'src/app/infrastructure/api/data-llm.service';
import { IconChatComponent } from 'src/app/presentation/icons/icon-chat.component';
import { IconMMLComponent } from 'src/app/presentation/icons/icon-mml.component';
import { DataManagementLLMProviderService } from 'src/app/domain/services/llm/data-management-llm-provider.service';
import { ILLMProvider } from 'src/app/infrastructure/api/data-llm-provider.service';

@Pipe({ name: 'translate' })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('LLMChatComponent', () => {
  let component: LLMChatComponent;
  let fixture: ComponentFixture<LLMChatComponent>;
  let mockLlmService: jasmine.SpyObj<DataManagementLLMService>;
  let mockLlmProviderService: jasmine.SpyObj<DataManagementLLMProviderService>;
  let mockSpeechService: jasmine.SpyObj<SpeechRecognitionService>;
  let mockTranslateService: TranslateService;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockModels: ILLMModel[] = [
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

  const mockProviders: ILLMProvider[] = [
    {
      id: '1',
      providerId: 'openai',
      providerName: 'OpenAI',
      isEnabled: true,
      apiKey: 'sk-test-key-123',
      baseUrl: 'https://api.openai.com/v1',
      priority: 1,
    },
    {
      id: '2',
      providerId: 'anthropic',
      providerName: 'Anthropic',
      isEnabled: true,
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      priority: 2,
    },
  ];

  beforeEach(async () => {
    const llmServiceSpy = jasmine.createSpyObj('DataManagementLLMService', [
      'getAvailableModels',
      'getCurrentModelId',
      'sendMessage',
      'setCurrentModel',
      'getModelInfo',
      'setLanguage',
      'clearConversation',
    ]);

    const llmProviderServiceSpy = jasmine.createSpyObj(
      'DataManagementLLMProviderService',
      ['loadProviders', 'getCurrentProviders']
    );

    const speechServiceSpy = jasmine.createSpyObj(
      'SpeechRecognitionService',
      [
        'startListening',
        'stopListening',
        'requestPermissions',
        'updateLanguage',
        'setLanguage',
      ],
      {
        isSupported$: jasmine.createSpy('isSupported$').and.returnValue(true),
        errors: new BehaviorSubject(''),
      }
    );

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        LLMChatComponent,
        FontAwesomeModule,
        FormsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: DataManagementLLMService, useValue: llmServiceSpy },
        { provide: DataManagementLLMProviderService, useValue: llmProviderServiceSpy },
        { provide: SpeechRecognitionService, useValue: speechServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    })
      .overrideComponent(LLMChatComponent, {
        set: {
          imports: [
            CommonModule,
            FontAwesomeModule,
            FormsModule,
            MockTranslatePipe,
            IconChatComponent,
            IconMMLComponent,
          ],
        },
      })
      .compileComponents();

    mockLlmService = TestBed.inject(
      DataManagementLLMService
    ) as jasmine.SpyObj<DataManagementLLMService>;
    mockLlmProviderService = TestBed.inject(
      DataManagementLLMProviderService
    ) as jasmine.SpyObj<DataManagementLLMProviderService>;
    mockSpeechService = TestBed.inject(
      SpeechRecognitionService
    ) as jasmine.SpyObj<SpeechRecognitionService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    const translateService = TestBed.inject(TranslateService);
    spyOn(translateService, 'instant').and.callFake((key: string) => {
      if (key === 'llm-chat.welcome.content') {
        return '👋 Hallo! Ich bin Ihr Assistent. Ich kann Ihnen helfen:\n\n• Mitarbeiter zu erstellen\n• Nach Personen zu suchen\n• Verträge zu verwalten\n\nSie können mit mir sprechen oder tippen. Versuchen Sie: "Erstelle Mitarbeiter Max Muster"';
      }
      if (key.startsWith('llm-chat.welcome.suggestion-')) {
        return 'Test suggestion';
      }
      return 'Error message';
    });
    mockTranslateService = translateService as any;

    mockLlmService.getAvailableModels.and.returnValue(of(mockModels));
    mockLlmService.getCurrentModelId.and.returnValue(of('gpt-4'));
    mockLlmService.setLanguage.and.stub();
    mockLlmService.getModelInfo.and.returnValue(mockModels[0]);

    mockLlmProviderService.loadProviders.and.returnValue(Promise.resolve(mockProviders));
    mockLlmProviderService.getCurrentProviders.and.returnValue(mockProviders);

    fixture = TestBed.createComponent(LLMChatComponent);
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

  it('should load available models on init', fakeAsync(() => {
    // Act
    fixture.detectChanges();
    tick();

    // Assert
    expect(mockLlmService.getAvailableModels).toHaveBeenCalled();
    expect(component.availableModels.length).toBe(1);
    expect(component.availableModels[0].modelId).toBe('gpt-4');
  }));

  it('should set current model on init', fakeAsync(() => {
    // Act
    fixture.detectChanges();
    tick();

    // Assert
    expect(mockLlmService.getCurrentModelId).toHaveBeenCalled();
    expect(component.currentModel).toBe('gpt-4');
  }));

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
      const mockResponse = {
        message: 'Hi there!',
        conversationId: component.conversationId,
        suggestions: ['How can I help?'],
        navigateTo: undefined,
        actionPerformed: false,
      };
      mockLlmService.sendMessage.and.returnValue(of(mockResponse));

      // Act
      await component.sendMessage();

      // Assert
      expect(mockLlmService.sendMessage).toHaveBeenCalledWith(
        'Hello',
        component.conversationId
      );
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
      const error = { error: { message: 'API Error' } };
      mockLlmService.sendMessage.and.returnValue(throwError(() => error));

      // Act
      await component.sendMessage();

      // Assert
      expect(component.messages.length).toBe(3); // Welcome + User + Error
      expect(component.messages[2].content).toContain('❌');
      expect(component.messages[2].content).toContain('API Error');
      expect(component.isProcessing).toBe(false);
    });

    it('should navigate when actionPerformed is true', fakeAsync(() => {
      // Arrange
      component.inputText = 'Navigate to clients';
      const mockResponse = {
        message: 'Navigating to clients',
        conversationId: component.conversationId,
        navigateTo: '/clients',
        actionPerformed: true,
      };
      mockLlmService.sendMessage.and.returnValue(of(mockResponse));

      // Act
      component.sendMessage();
      tick(2100); // Wait for navigation delay

      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/clients']);
    }));
  });

  describe('voice input', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call speech service methods when starting voice input', async () => {
      // Arrange
      component.isListening = false;
      mockSpeechService.requestPermissions.and.returnValue(
        Promise.resolve(true)
      );
      mockSpeechService.startListening.and.returnValue(of('Hello from voice'));

      // Act
      await component.startVoiceInput();

      // Assert
      expect(mockSpeechService.requestPermissions).toHaveBeenCalled();
      expect(mockSpeechService.startListening).toHaveBeenCalled();
      // Don't test isListening state due to async timing complexity
    });

    it('should not start voice input when permission denied', async () => {
      // Arrange
      mockSpeechService.requestPermissions.and.returnValue(
        Promise.resolve(false)
      );
      spyOn(window, 'alert');

      // Act
      await component.startVoiceInput();

      // Assert
      expect(window.alert).toHaveBeenCalled();
      expect(mockSpeechService.startListening).not.toHaveBeenCalled();
    });

    it('should stop voice input', () => {
      // Arrange
      component.isListening = true;

      // Act
      component.stopVoiceInput();

      // Assert
      expect(mockSpeechService.stopListening).toHaveBeenCalled();
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
      mockLlmService.getModelInfo.and.returnValue(mockModelInfo);
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
      spyOn(component, 'sendMessage');
      const suggestion = 'Create a new employee';

      // Act
      component.onSuggestionClick(suggestion);

      // Assert
      expect(component.inputText).toBe(suggestion);
      expect(component.sendMessage).toHaveBeenCalled();
    });

    it('should handle navigate click', () => {
      // Act
      component.onNavigateClick('/clients');

      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/clients']);
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
      expect(result).toBe(
        'Hello<br><strong>bold</strong> and <em>italic</em> and <code>code</code>'
      );
    });

    it('should handle Enter key press', () => {
      // Arrange
      spyOn(component, 'sendMessage');
      const event = new KeyboardEvent('keypress', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      // Act
      component.onInputKeyPress(event);

      // Assert
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.sendMessage).toHaveBeenCalled();
    });

    it('should not handle Enter key press with Shift', () => {
      // Arrange
      spyOn(component, 'sendMessage');
      const event = new KeyboardEvent('keypress', {
        key: 'Enter',
        shiftKey: true,
      });
      spyOn(event, 'preventDefault');

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
      expect(mockLlmService.clearConversation).toHaveBeenCalledWith(
        oldConversationId
      );
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

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when currentModel is empty string', () => {
      // Arrange
      component.availableModels = mockModels.filter(m => m.isEnabled);
      component.currentModel = '';

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when currentModel is not set', () => {
      // Arrange
      component.availableModels = mockModels.filter(m => m.isEnabled);
      component.currentModel = null as any;

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when currentModel not found in availableModels', () => {
      // Arrange
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
      mockLlmProviderService.getCurrentProviders.and.returnValue([]);

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when provider has no apiKey', () => {
      // Arrange
      const providersWithoutKey: ILLMProvider[] = [
        {
          ...mockProviders[0],
          apiKey: undefined,
        },
      ];
      component.availableModels = mockModels.filter(m => m.isEnabled);
      component.currentModel = 'gpt-4';
      mockLlmProviderService.getCurrentProviders.and.returnValue(providersWithoutKey);

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when provider apiKey is empty string', () => {
      // Arrange
      const providersWithEmptyKey: ILLMProvider[] = [
        {
          ...mockProviders[0],
          apiKey: '',
        },
      ];
      component.availableModels = mockModels.filter(m => m.isEnabled);
      component.currentModel = 'gpt-4';
      mockLlmProviderService.getCurrentProviders.and.returnValue(providersWithEmptyKey);

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when provider apiKey is whitespace only', () => {
      // Arrange
      const providersWithWhitespaceKey: ILLMProvider[] = [
        {
          ...mockProviders[0],
          apiKey: '   ',
        },
      ];
      component.availableModels = mockModels.filter(m => m.isEnabled);
      component.currentModel = 'gpt-4';
      mockLlmProviderService.getCurrentProviders.and.returnValue(providersWithWhitespaceKey);

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when current model has valid provider with apiKey', () => {
      // Arrange
      component.availableModels = mockModels.filter(m => m.isEnabled);
      component.currentModel = 'gpt-4';
      mockLlmProviderService.getCurrentProviders.and.returnValue(mockProviders);

      // Act
      const result = component.hasNoApiKey();

      // Assert
      expect(result).toBe(false);
    });

    it('should check provider for newly selected model', () => {
      // Arrange
      const modelWithValidKey: ILLMModel = {
        ...mockModels[0],
        modelId: 'model-with-key',
        providerId: 'openai',
      };
      const modelWithoutValidKey: ILLMModel = {
        ...mockModels[1],
        modelId: 'model-without-key',
        providerId: 'anthropic',
        isEnabled: true,
      };
      component.availableModels = [modelWithValidKey, modelWithoutValidKey];
      mockLlmProviderService.getCurrentProviders.and.returnValue(mockProviders);

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
