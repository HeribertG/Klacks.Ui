/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { LLMModelsComponent } from './llm-models.component';
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
import { DataManagementLLMProviderService } from 'src/app/domain/services/llm/data-management-llm-provider.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ILLMModel } from 'src/app/infrastructure/api/data-llm.service';
import { ILLMProvider } from 'src/app/infrastructure/api/data-llm-provider.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { Subject } from 'rxjs';

describe('LLMModelsComponent', () => {
  let component: LLMModelsComponent;
  let fixture: ComponentFixture<LLMModelsComponent>;
  let mockLLMService: jasmine.SpyObj<DataManagementLLMService>;
  let mockProviderService: jasmine.SpyObj<DataManagementLLMProviderService>;
  let mockToastService: jasmine.SpyObj<ToastShowService>;
  let mockNgbModal: jasmine.SpyObj<NgbModal>;
  let mockModalService: jasmine.SpyObj<ModalService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  const mockModels: ILLMModel[] = [
    {
      id: '1',
      modelId: 'gpt-4',
      apiModelId: 'gpt-4-turbo',
      modelName: 'GPT-4',
      displayName: 'GPT-4 Turbo',
      providerId: 'openai',
      contextWindow: 128000,
      maxTokens: 4096,
      costPerInputToken: 0.01,
      costPerOutputToken: 0.03,
      isEnabled: true,
      isDefault: true,
      capabilities: ['chat'],
    },
    {
      id: '2',
      modelId: 'claude-3',
      apiModelId: 'claude-3-opus',
      modelName: 'Claude 3',
      providerId: 'anthropic',
      contextWindow: 200000,
      maxTokens: 4096,
      costPerInputToken: 0.015,
      costPerOutputToken: 0.075,
      isEnabled: false,
      isDefault: false,
      capabilities: ['chat'],
    },
  ];

  const mockProviders: ILLMProvider[] = [
    {
      id: '1',
      providerId: 'openai',
      providerName: 'OpenAI',
      isEnabled: true,
      priority: 1,
    },
    {
      id: '2',
      providerId: 'anthropic',
      providerName: 'Anthropic',
      isEnabled: true,
      priority: 2,
    },
  ];

  beforeEach(async () => {
    spyOn(console, 'error');

    const llmServiceSpy = jasmine.createSpyObj('DataManagementLLMService', [
      'getAvailableModels',
      'createModel',
      'updateModel',
      'deleteModel',
    ]);

    const providerServiceSpy = jasmine.createSpyObj(
      'DataManagementLLMProviderService',
      ['getProviders']
    );

    const toastServiceSpy = jasmine.createSpyObj('ToastShowService', [
      'showError',
      'showSuccess',
    ]);

    const ngbModalSpy = jasmine.createSpyObj('NgbModal', ['open']);
    const modalServiceSpy = jasmine.createSpyObj('ModalService', [
      'openModel',
      'setDefault',
    ]);
    modalServiceSpy.resultEvent = new Subject();

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    llmServiceSpy.getAvailableModels.and.returnValue(of(mockModels));
    providerServiceSpy.getProviders.and.returnValue(of(mockProviders));

    await TestBed.configureTestingModule({
      imports: [LLMModelsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementLLMService, useValue: llmServiceSpy },
        {
          provide: DataManagementLLMProviderService,
          useValue: providerServiceSpy,
        },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: ModalService, useValue: modalServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockLLMService = TestBed.inject(
      DataManagementLLMService
    ) as jasmine.SpyObj<DataManagementLLMService>;
    mockNgbModal = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
    mockModalService = TestBed.inject(ModalService) as jasmine.SpyObj<ModalService>;
    mockProviderService = TestBed.inject(
      DataManagementLLMProviderService
    ) as jasmine.SpyObj<DataManagementLLMProviderService>;
    mockToastService = TestBed.inject(
      ToastShowService
    ) as jasmine.SpyObj<ToastShowService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(LLMModelsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load models on init', () => {
      fixture.detectChanges();

      expect(mockLLMService.getAvailableModels).toHaveBeenCalled();
      expect(component.models.length).toBe(2);
      expect(component.models).toEqual(mockModels);
    });

    it('should load providers on init', () => {
      fixture.detectChanges();

      expect(mockProviderService.getProviders).toHaveBeenCalled();
      expect(component.availableProviders.length).toBe(2);
    });

    it('should filter only enabled providers', () => {
      const providersWithDisabled = [
        ...mockProviders,
        {
          id: '3',
          providerId: 'disabled',
          providerName: 'Disabled',
          isEnabled: false,
          priority: 3,
        },
      ];
      mockProviderService.getProviders.and.returnValue(
        of(providersWithDisabled)
      );

      fixture.detectChanges();

      expect(component.availableProviders.length).toBe(2);
      expect(component.availableProviders.every((p) => p.isEnabled)).toBe(true);
    });

    it('should handle model loading error', () => {
      mockLLMService.getAvailableModels.and.returnValue(
        throwError(() => new Error('Load error'))
      );

      fixture.detectChanges();

      expect(mockToastService.showError).toHaveBeenCalledWith(
        'settings.llm-models.error.load-models'
      );
      expect(component.models.length).toBe(0);
      expect(component.isLoading).toBe(false);
    });

    it('should handle provider loading error with fallback', () => {
      mockProviderService.getProviders.and.returnValue(
        throwError(() => new Error('Provider error'))
      );

      fixture.detectChanges();

      expect(component.availableProviders.length).toBeGreaterThan(0);
      expect(
        component.availableProviders.some((p) => p.providerId === 'openai')
      ).toBe(true);
    });
  });

  describe('Add Model', () => {
    it('should initialize new model with default values', (done) => {
      component.onClickAdd();

      setTimeout(() => {
        expect(component.isNewModel).toBe(true);
        expect(component.editingModel).toBeTruthy();
        expect(component.editingModel?.modelId).toBe('');
        expect(component.editingModel?.isEnabled).toBe(true);
        expect(component.editingModel?.contextWindow).toBe(4096);
        expect(component.editingModel?.maxTokens).toBe(4096);
        expect(component.editingModel?.isDefault).toBe(false);
        expect(component.editingModel?.capabilities).toContain('chat');
        done();
      }, 10);
    });
  });

  describe('Edit Model', () => {
    it('should set editing model and reset API key', () => {
      const modelToEdit = mockModels[0];
      component.providerApiKey = 'old-key';

      component.onClickEdit(modelToEdit);

      expect(component.isNewModel).toBe(false);
      expect(component.editingModel).toEqual(modelToEdit);
      expect(component.providerApiKey).toBe('');
    });
  });

  describe('Delete Model', () => {
    beforeEach(() => {
      component.models = [...mockModels];
    });

    it('should not delete if model has no id', () => {
      const invalidModel = { id: undefined } as ILLMModel;
      component.openDeleteModel(invalidModel);

      expect(mockModalService.openModel).not.toHaveBeenCalled();
    });
  });

  describe('Save Model', () => {
    let mockModal: any;

    beforeEach(() => {
      mockModal = { close: jasmine.createSpy('close') };
    });

    it('should create new model', async () => {
      component.isNewModel = true;
      component.editingModel = {
        modelId: 'new-model',
        apiModelId: 'new-model-api',
        modelName: 'New Model',
        providerId: 'openai',
        contextWindow: 8000,
        maxTokens: 2000,
        costPerInputToken: 0.01,
        costPerOutputToken: 0.02,
        isEnabled: true,
        isDefault: false,
        capabilities: ['chat'],
      };
      mockLLMService.createModel.and.returnValue(of(component.editingModel));

      await component.onSaveModal(mockModal);

      expect(mockLLMService.createModel).toHaveBeenCalled();
      expect(mockToastService.showSuccess).toHaveBeenCalledWith(
        'settings.llm-models.success.create',
        'Success'
      );
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should update existing model', async () => {
      component.isNewModel = false;
      component.onClickEdit(mockModels[0]);
      component.editingModel!.maxTokens = 8000;
      mockLLMService.updateModel.and.returnValue(of(component.editingModel!));

      await component.onSaveModal(mockModal);

      expect(mockLLMService.updateModel).toHaveBeenCalled();
      expect(mockToastService.showSuccess).toHaveBeenCalledWith(
        'settings.llm-models.success.update',
        'Success'
      );
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should include API key if provided', async () => {
      component.isNewModel = true;
      component.providerApiKey = 'test-api-key';
      component.editingModel = {
        modelId: 'test',
        apiModelId: 'test-api',
        modelName: 'Test',
        providerId: 'openai',
        contextWindow: 4096,
        maxTokens: 4096,
        costPerInputToken: 0.01,
        costPerOutputToken: 0.02,
        isEnabled: true,
        isDefault: false,
        capabilities: ['chat'],
      };
      mockLLMService.createModel.and.returnValue(of(component.editingModel));

      await component.onSaveModal(mockModal);

      expect(component.editingModel.providerApiKey).toBe('test-api-key');
    });

    it('should handle save error', async () => {
      component.isNewModel = true;
      component.editingModel = {
        modelId: 'test',
        apiModelId: 'test-api',
        modelName: 'Test',
        providerId: 'openai',
        contextWindow: 4096,
        maxTokens: 4096,
        costPerInputToken: 0.01,
        costPerOutputToken: 0.02,
        isEnabled: true,
        isDefault: false,
        capabilities: ['chat'],
      };
      mockLLMService.createModel.and.returnValue(
        throwError(() => new Error('Save failed'))
      );

      await component.onSaveModal(mockModal);

      expect(mockToastService.showError).toHaveBeenCalledWith(
        'settings.llm-models.error.save'
      );
      expect(mockModal.close).not.toHaveBeenCalled();
    });

    it('should not save if form is invalid', async () => {
      component.editingModel = {
        modelId: '',
        apiModelId: '',
        modelName: '',
        providerId: '',
        contextWindow: 0,
        maxTokens: 0,
        costPerInputToken: 0,
        costPerOutputToken: 0,
        isEnabled: true,
        isDefault: false,
        capabilities: [],
      };

      await component.onSaveModal(mockModal);

      expect(mockLLMService.createModel).not.toHaveBeenCalled();
      expect(mockLLMService.updateModel).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      component.editingModel = {
        modelId: 'test',
        apiModelId: 'test-api',
        modelName: 'Test Model',
        providerId: 'openai',
        contextWindow: 4096,
        maxTokens: 2000,
        costPerInputToken: 0.01,
        costPerOutputToken: 0.02,
        isEnabled: true,
        isDefault: false,
        capabilities: ['chat'],
      };
    });

    it('should validate complete model', () => {
      expect(component.isFormValid()).toBe(true);
    });

    it('should fail validation if modelId is missing', () => {
      component.editingModel!.modelId = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if modelName is missing', () => {
      component.editingModel!.modelName = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if apiModelId is missing', () => {
      component.editingModel!.apiModelId = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if providerId is missing', () => {
      component.editingModel!.providerId = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if contextWindow is zero or negative', () => {
      component.editingModel!.contextWindow = 0;

      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if maxTokens is zero or negative', () => {
      component.editingModel!.maxTokens = -1;

      expect(component.isFormValid()).toBe(false);
    });

    it('should accept zero costs', () => {
      component.editingModel!.costPerInputToken = 0;
      component.editingModel!.costPerOutputToken = 0;

      expect(component.isFormValid()).toBe(true);
    });

    it('should return validation error messages', () => {
      component.editingModel!.modelId = '';
      component.editingModel!.modelName = '';

      const errors = component.getValidationErrors();

      expect(errors.length).toBeGreaterThan(0);
      expect(mockTranslateService.instant).toHaveBeenCalled();
    });

    it('should require API key for new models with certain providers', () => {
      component.isNewModel = true;
      component.editingModel!.providerId = 'openai';
      component.providerApiKey = '';

      component.getValidationErrors();

      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'settings.llm-models.validation.api-key-required'
      );
    });
  });

  describe('Helper Methods', () => {
    it('should format cost correctly', () => {
      const formatted = component.formatCost(0.0123);

      expect(formatted).toBe('€0.0123/1K');
    });

    it('should generate provider class name', () => {
      const className = component.getProviderClass('OpenAI');

      expect(className).toBe('provider-openai');
    });

    it('should determine if provider API key is editable', () => {
      component.editingModel = {
        modelId: 'test',
        apiModelId: 'test',
        modelName: 'Test',
        providerId: 'openai',
        contextWindow: 4096,
        maxTokens: 4096,
        costPerInputToken: 0.01,
        costPerOutputToken: 0.02,
        isEnabled: true,
        isDefault: false,
        capabilities: ['chat'],
      };
      component.isNewModel = true;

      expect(component.isProviderApiKeyEditable()).toBe(true);
    });

    it('should not allow API key edit for non-API providers', () => {
      component.editingModel = {
        modelId: 'test',
        apiModelId: 'test',
        modelName: 'Test',
        providerId: 'local',
        contextWindow: 4096,
        maxTokens: 4096,
        costPerInputToken: 0.01,
        costPerOutputToken: 0.02,
        isEnabled: true,
        isDefault: false,
        capabilities: ['chat'],
      };
      component.isNewModel = true;

      expect(component.isProviderApiKeyEditable()).toBe(false);
    });
  });

});
