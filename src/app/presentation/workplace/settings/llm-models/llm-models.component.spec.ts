// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { LLMModelsComponent } from './llm-models.component';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { IAssistantProvider } from 'src/app/infrastructure/api/assistant/data-assistant-provider.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { Subject } from 'rxjs';

describe('LLMModelsComponent', () => {
    let component: LLMModelsComponent;
    let fixture: ComponentFixture<LLMModelsComponent>;
    let mockLLMService: any;
    let mockProviderService: any;
    let mockToastService: any;
    let mockNgbModal: any;
    let mockModalService: any;
    let mockTranslateService: any;

    const mockModels: IAssistantModel[] = [
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

    const mockProviders: IAssistantProvider[] = [
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
        vi.spyOn(console, 'error');

        const llmServiceSpy = {
            getAvailableModels: vi.fn(),
            createModel: vi.fn(),
            updateModel: vi.fn(),
            deleteModel: vi.fn()
        };

        const providerServiceSpy = {
            getProviders: vi.fn()
        };

        const toastServiceSpy = {
            showError: vi.fn(),
            showSuccess: vi.fn()
        };

        const ngbModalSpy = {
            open: vi.fn()
        };
        const modalServiceSpy: any = {
            openModel: vi.fn(),
            setDefault: vi.fn(),
            resultEvent: new Subject()
        };

        const translateServiceSpy = {
            instant: vi.fn()
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');

        llmServiceSpy.getAvailableModels.mockReturnValue(of(mockModels));
        providerServiceSpy.getProviders.mockReturnValue(of(mockProviders));

        await TestBed.configureTestingModule({
            imports: [LLMModelsComponent, TranslateModule.forRoot()],
            providers: [
                { provide: DataManagementAssistantService, useValue: llmServiceSpy },
                {
                    provide: DataManagementAssistantProviderService,
                    useValue: providerServiceSpy,
                },
                { provide: ToastShowService, useValue: toastServiceSpy },
                { provide: NgbModal, useValue: ngbModalSpy },
                { provide: ModalService, useValue: modalServiceSpy },
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
        }).compileComponents();

        mockLLMService = TestBed.inject(DataManagementAssistantService) as any;
        mockNgbModal = TestBed.inject(NgbModal) as any;
        mockModalService = TestBed.inject(ModalService) as any;
        mockProviderService = TestBed.inject(DataManagementAssistantProviderService) as any;
        mockToastService = TestBed.inject(ToastShowService) as any;
        mockTranslateService = TestBed.inject(TranslateService) as any;

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
            mockProviderService.getProviders.mockReturnValue(of(providersWithDisabled));

            fixture.detectChanges();

            expect(component.availableProviders.length).toBe(2);
            expect(component.availableProviders.every((p) => p.isEnabled)).toBe(true);
        });

        it('should handle model loading error', () => {
            mockLLMService.getAvailableModels.mockReturnValue(throwError(() => new Error('Load error')));

            fixture.detectChanges();

            expect(mockToastService.showError).toHaveBeenCalledWith('Translated text');
            expect(component.models.length).toBe(0);
            expect(component.isLoading).toBe(false);
        });

        it('should handle provider loading error with fallback', () => {
            mockProviderService.getProviders.mockReturnValue(throwError(() => new Error('Provider error')));

            fixture.detectChanges();

            expect(component.availableProviders.length).toBeGreaterThan(0);
            expect(component.availableProviders.some((p) => p.providerId === 'openai')).toBe(true);
        });
    });

    describe('Add Model', () => {
        it('should initialize new model with default values', () => {
            // Arrange
            vi.useFakeTimers();

            // Act
            component.onClickAdd();
            vi.advanceTimersByTime(10);

            // Assert
            expect(component.isNewModel).toBe(true);
            expect(component.editingModel).toBeTruthy();
            expect(component.editingModel?.modelId).toBe('');
            expect(component.editingModel?.isEnabled).toBe(true);
            expect(component.editingModel?.contextWindow).toBe(4096);
            expect(component.editingModel?.maxTokens).toBe(4096);
            expect(component.editingModel?.isDefault).toBe(false);
            expect(component.editingModel?.capabilities).toContain('chat');

            vi.useRealTimers();
        });
    });

    describe('Edit Model', () => {
        it('should set editing model and reset API key', () => {
            // Arrange
            vi.useFakeTimers();
            const modelToEdit = mockModels[0];

            // Act
            component.onClickEdit(modelToEdit);
            vi.advanceTimersByTime(10);

            // Assert
            expect(component.isNewModel).toBe(false);
            expect(component.editingModel).toEqual(modelToEdit);
            const formData = (component as any).formModel();
            expect(formData.providerApiKey).toBe('');

            vi.useRealTimers();
        });
    });

    describe('Delete Model', () => {
        beforeEach(() => {
            component.models = [...mockModels];
        });

        it('should not delete if model has no id', () => {
            const invalidModel = { id: undefined } as IAssistantModel;
            component.openDeleteModel(invalidModel);

            expect(mockModalService.openModel).not.toHaveBeenCalled();
        });
    });

    describe('Save Model', () => {
        let mockModal: any;

        beforeEach(() => {
            mockModal = { close: vi.fn() };
        });

        it('should create new model', async () => {
            // Arrange
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
            (component as any).formModel.set({
                modelId: 'new-model',
                modelName: 'New Model',
                providerId: 'openai',
                description: '',
                apiModelId: 'new-model-api',
                contextWindow: '8000',
                maxTokens: '2000',
                costPerInputToken: '0.01',
                costPerOutputToken: '0.02',
                providerApiKey: 'test-key',
                isEnabled: true,
                isDefault: false,
            });
            mockLLMService.createModel.mockReturnValue(of(component.editingModel));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockLLMService.createModel).toHaveBeenCalled();
            expect(mockToastService.showSuccess).toHaveBeenCalledWith('Translated text', 'Translated text');
            expect(mockModal.close).toHaveBeenCalled();
        });

        it('should update existing model', async () => {
            // Arrange
            vi.useFakeTimers();
            component.isNewModel = false;
            component.onClickEdit(mockModels[0]);
            vi.advanceTimersByTime(10);
            component.editingModel!.maxTokens = 8000;
            mockLLMService.updateModel.mockReturnValue(of(component.editingModel!));
            vi.useRealTimers();

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockLLMService.updateModel).toHaveBeenCalled();
            expect(mockToastService.showSuccess).toHaveBeenCalledWith('Translated text', 'Translated text');
            expect(mockModal.close).toHaveBeenCalled();
        });

        it('should include API key if provided', async () => {
            // Arrange
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
            (component as any).formModel.set({
                modelId: 'test',
                modelName: 'Test',
                providerId: 'openai',
                description: '',
                apiModelId: 'test-api',
                contextWindow: '4096',
                maxTokens: '4096',
                costPerInputToken: '0.01',
                costPerOutputToken: '0.02',
                providerApiKey: 'test-api-key',
                isEnabled: true,
                isDefault: false,
            });
            mockLLMService.createModel.mockReturnValue(of(component.editingModel));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(component.editingModel.providerApiKey).toBe('test-api-key');
        });

        it('should handle save error', async () => {
            // Arrange
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
            (component as any).formModel.set({
                modelId: 'test',
                modelName: 'Test',
                providerId: 'openai',
                description: '',
                apiModelId: 'test-api',
                contextWindow: '4096',
                maxTokens: '4096',
                costPerInputToken: '0.01',
                costPerOutputToken: '0.02',
                providerApiKey: 'test-key',
                isEnabled: true,
                isDefault: false,
            });
            mockLLMService.createModel.mockReturnValue(throwError(() => new Error('Save failed')));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockToastService.showError).toHaveBeenCalledWith('Translated text');
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
            (component as any).formModel.set({
                modelId: 'test',
                modelName: 'Test Model',
                providerId: 'openai',
                description: '',
                apiModelId: 'test-api',
                contextWindow: '4096',
                maxTokens: '2000',
                costPerInputToken: '0.01',
                costPerOutputToken: '0.02',
                providerApiKey: '',
                isEnabled: true,
                isDefault: false,
            });
        });

        it('should validate complete model', () => {
            expect(component.isFormValid()).toBe(true);
        });

        it('should fail validation if modelId is missing', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, modelId: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should fail validation if modelName is missing', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, modelName: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should fail validation if apiModelId is missing', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, apiModelId: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should fail validation if providerId is missing', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, providerId: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should fail validation if contextWindow is zero or negative', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, contextWindow: '0' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should fail validation if maxTokens is zero or negative', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, maxTokens: '-1' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should accept zero costs', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, costPerInputToken: '0', costPerOutputToken: '0' });

            // Assert
            expect(component.isFormValid()).toBe(true);
        });

        it('should return validation error messages', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, modelId: '', modelName: '' });

            // Act
            const errors = component.getValidationErrors();

            // Assert
            expect(errors.length).toBeGreaterThan(0);
            expect(mockTranslateService.instant).toHaveBeenCalled();
        });

        it('should require API key for new models with certain providers', () => {
            // Arrange
            component.isNewModel = true;
            component.editingModel!.providerId = 'openai';
            (component as any).formModel.set({
                modelId: 'test',
                modelName: 'Test Model',
                providerId: 'openai',
                description: '',
                apiModelId: 'test-api',
                contextWindow: '4096',
                maxTokens: '2000',
                costPerInputToken: '0.01',
                costPerOutputToken: '0.02',
                providerApiKey: '',
                isEnabled: true,
                isDefault: false,
            });

            // Act
            component.getValidationErrors();

            // Assert
            expect(mockTranslateService.instant).toHaveBeenCalledWith('settings.llm-models.validation.api-key-required');
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
            // Arrange
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
            (component as any).formModel.set({
                modelId: 'test',
                modelName: 'Test',
                providerId: 'openai',
                description: '',
                apiModelId: 'test',
                contextWindow: '4096',
                maxTokens: '4096',
                costPerInputToken: '0.01',
                costPerOutputToken: '0.02',
                providerApiKey: '',
                isEnabled: true,
                isDefault: false,
            });

            // Assert
            expect(component.isProviderApiKeyEditable()).toBe(true);
        });

        it('should not allow API key edit for non-API providers', () => {
            // Arrange
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
            (component as any).formModel.set({
                modelId: 'test',
                modelName: 'Test',
                providerId: 'local',
                description: '',
                apiModelId: 'test',
                contextWindow: '4096',
                maxTokens: '4096',
                costPerInputToken: '0.01',
                costPerOutputToken: '0.02',
                providerApiKey: '',
                isEnabled: true,
                isDefault: false,
            });

            // Assert
            expect(component.isProviderApiKeyEditable()).toBe(false);
        });
    });
});
