/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { LLMProvidersComponent } from './llm-providers.component';
import { DataManagementLLMProviderService } from 'src/app/domain/services/llm/data-management-llm-provider.service';
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ILLMProvider } from 'src/app/infrastructure/api/llm/data-llm-provider.service';
import { signal } from '@angular/core';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

describe('LLMProvidersComponent', () => {
    let component: LLMProvidersComponent;
    let fixture: ComponentFixture<LLMProvidersComponent>;
    let mockProviderService: any;
    let mockLLMService: any;
    let mockToastService: any;
    let mockNgbModal: any;
    let mockModalService: ModalService;
    let mockTranslateService: any;

    const mockProviders: ILLMProvider[] = [
        {
            id: '1',
            providerId: 'openai',
            providerName: 'OpenAI',
            baseUrl: 'https://api.openai.com',
            apiVersion: 'v1',
            apiKey: 'sk-test123',
            isEnabled: true,
            priority: 1,
        },
        {
            id: '2',
            providerId: 'anthropic',
            providerName: 'Anthropic',
            baseUrl: 'https://api.anthropic.com',
            apiVersion: 'v1',
            apiKey: 'sk-ant-test',
            isEnabled: false,
            priority: 2,
        },
        {
            id: '3',
            providerId: 'google',
            providerName: 'Google',
            baseUrl: 'https://generativelanguage.googleapis.com',
            apiVersion: 'v1',
            isEnabled: true,
            priority: 3,
        },
    ];

    beforeEach(async () => {
        const providerServiceSpy = {
            loadProviders: vi.fn(),
            createProvider: vi.fn(),
            updateProvider: vi.fn(),
            deleteProvider: vi.fn(),
            toggleProviderStatus: vi.fn(),
            getProviders: vi.fn(),
            providers$: of(mockProviders),
            isLoading: signal(false)
        };

        const llmServiceSpy = {
            reloadModels: vi.fn(),
            getDefaultModel: vi.fn()
        };

        const toastServiceSpy = {
            showError: vi.fn(),
            showSuccess: vi.fn()
        };

        const ngbModalSpy = {
            open: vi.fn()
        };

        const translateServiceSpy = {
            instant: vi.fn()
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');

        providerServiceSpy.loadProviders.mockReturnValue(Promise.resolve());
        providerServiceSpy.getProviders.mockReturnValue(of(mockProviders));
        llmServiceSpy.getDefaultModel.mockReturnValue(null);

        await TestBed.configureTestingModule({
            imports: [LLMProvidersComponent, TranslateModule.forRoot()],
            providers: [
                {
                    provide: DataManagementLLMProviderService,
                    useValue: providerServiceSpy,
                },
                { provide: DataManagementLLMService, useValue: llmServiceSpy },
                { provide: ToastShowService, useValue: toastServiceSpy },
                { provide: NgbModal, useValue: ngbModalSpy },
                ModalService,
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
        }).compileComponents();

        mockProviderService = TestBed.inject(DataManagementLLMProviderService) as any;
        mockLLMService = TestBed.inject(DataManagementLLMService) as any;
        mockToastService = TestBed.inject(ToastShowService) as any;
        mockNgbModal = TestBed.inject(NgbModal) as any;
        mockModalService = TestBed.inject(ModalService);
        mockTranslateService = TestBed.inject(TranslateService) as any;

        fixture = TestBed.createComponent(LLMProvidersComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should load providers on init', async () => {
            fixture.detectChanges();
            await fixture.whenStable();

            expect(mockProviderService.loadProviders).toHaveBeenCalled();
        });

        it('should subscribe to providers$', async () => {
            fixture.detectChanges();

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(component.providers.length).toBe(3);
            expect(component.providers).toEqual(mockProviders);
        });
    });

    describe('Add Provider', () => {
        it('should initialize new provider with default values', () => {
            // Arrange
            vi.useFakeTimers();

            // Act
            component.onClickAdd();
            vi.advanceTimersByTime(10);

            // Assert
            expect(component.isNewProvider).toBe(true);
            expect(component.editingProvider).toBeTruthy();
            expect(component.editingProvider?.providerId).toBe('');
            expect(component.editingProvider?.isEnabled).toBe(true);
            expect(component.editingProvider?.priority).toBe(10);
            const formData = (component as any).formModel();
            expect(formData.providerApiKey).toBe('');

            vi.useRealTimers();
        });
    });

    describe('Edit Provider', () => {
        it('should set editing provider and API key', () => {
            // Arrange
            vi.useFakeTimers();
            const providerToEdit = mockProviders[0];

            // Act
            component.onClickEdit(providerToEdit);
            vi.advanceTimersByTime(10);

            // Assert
            expect(component.isNewProvider).toBe(false);
            expect(component.editingProvider).toEqual(providerToEdit);
            const formData = (component as any).formModel();
            expect(formData.providerApiKey).toBe('sk-test123');

            vi.useRealTimers();
        });

        it('should handle provider without API key', () => {
            // Arrange
            vi.useFakeTimers();
            const providerWithoutKey = mockProviders[2];

            // Act
            component.onClickEdit(providerWithoutKey);
            vi.advanceTimersByTime(10);

            // Assert
            const formData = (component as any).formModel();
            expect(formData.providerApiKey).toBe('');

            vi.useRealTimers();
        });
    });

    describe('Delete Provider', () => {
        beforeEach(() => {
            component.providers = [...mockProviders];
            fixture.detectChanges();
        });

        it('should open delete modal with correct context', () => {
            // Arrange
            const providerToDelete = mockProviders[0];

            // Act
            component.openDeleteProvider(providerToDelete);

            // Assert
            expect(mockModalService.componentContext).toBe('llm-providers');
            expect(mockModalService.Filing).toBe(providerToDelete.id as string);
        });

        it('should not open delete modal if provider has no id', () => {
            // Arrange
            const providerWithoutId: ILLMProvider = {
                id: '',
                providerId: 'test',
                providerName: 'Test',
                baseUrl: 'https://test.com',
                apiVersion: 'v1',
                isEnabled: true,
                priority: 1
            };

            // Act
            component.openDeleteProvider(providerWithoutId);

            // Assert
            expect(mockModalService.Filing).toBe('');
        });

        it('should delete provider when modal service confirms', async () => {
            // Arrange
            const providerToDelete = mockProviders[0];
            mockProviderService.deleteProvider.mockReturnValue(Promise.resolve(true));

            // Act
            component.openDeleteProvider(providerToDelete);
            mockModalService.result(ModalType.Delete);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert
            expect(mockProviderService.deleteProvider).toHaveBeenCalledWith(providerToDelete.id);
        });
    });

    describe('Toggle Provider Status', () => {
        beforeEach(() => {
            component.providers = [...mockProviders];
        });

        it('should toggle provider status', async () => {
            mockProviderService.toggleProviderStatus.mockReturnValue(Promise.resolve(true));

            await component.onClickToggleEnable(0);

            expect(mockProviderService.toggleProviderStatus).toHaveBeenCalledWith('1', false);
        });


        it('should not toggle if index is invalid', async () => {
            await component.onClickToggleEnable(-1);

            expect(mockProviderService.toggleProviderStatus).not.toHaveBeenCalled();
        });

        it('should not toggle if provider has no ID', async () => {
            const providerWithoutId = { ...mockProviders[0], id: undefined } as any;
            component.providers = [providerWithoutId];

            await component.onClickToggleEnable(0);

            expect(mockProviderService.toggleProviderStatus).not.toHaveBeenCalled();
        });
    });

    describe('Save Provider', () => {
        let mockModal: any;

        beforeEach(() => {
            mockModal = { close: vi.fn() };
        });

        it('should create new provider', async () => {
            // Arrange
            component.isNewProvider = true;
            component.editingProvider = {
                id: '',
                providerId: 'new-provider',
                providerName: 'New Provider',
                baseUrl: 'https://api.new.com',
                apiVersion: 'v1',
                isEnabled: true,
                priority: 10,
            };
            (component as any).formModel.set({
                providerId: 'new-provider',
                providerName: 'New Provider',
                baseUrl: 'https://api.new.com',
                apiVersion: 'v1',
                priority: '10',
                providerApiKey: 'new-api-key',
                isEnabled: true,
            });
            mockProviderService.createProvider.mockReturnValue(Promise.resolve(component.editingProvider));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockProviderService.createProvider).toHaveBeenCalled();
            expect(mockLLMService.reloadModels).toHaveBeenCalled();
            expect(mockModal.close).toHaveBeenCalled();
        });

        it('should update existing provider', async () => {
            // Arrange
            component.isNewProvider = false;
            component.editingProvider = { ...mockProviders[0], priority: 5 };
            (component as any).formModel.set({
                providerId: mockProviders[0].providerId,
                providerName: mockProviders[0].providerName,
                baseUrl: mockProviders[0].baseUrl || '',
                apiVersion: mockProviders[0].apiVersion || '',
                priority: '5',
                providerApiKey: 'updated-key',
                isEnabled: true,
            });
            mockProviderService.updateProvider.mockReturnValue(Promise.resolve(component.editingProvider));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockProviderService.updateProvider).toHaveBeenCalled();
            expect(mockLLMService.reloadModels).toHaveBeenCalled();
            expect(mockModal.close).toHaveBeenCalled();
        });

        it('should not save if form is invalid', async () => {
            // Arrange
            component.editingProvider = {
                id: '',
                providerId: '',
                providerName: '',
                baseUrl: '',
                apiVersion: '',
                isEnabled: true,
                priority: 10,
            };
            (component as any).formModel.set({
                providerId: '',
                providerName: '',
                baseUrl: '',
                apiVersion: '',
                priority: '10',
                providerApiKey: '',
                isEnabled: true,
            });

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockProviderService.createProvider).not.toHaveBeenCalled();
            expect(mockProviderService.updateProvider).not.toHaveBeenCalled();
        });

        it('should not update provider without ID', async () => {
            // Arrange
            component.isNewProvider = false;
            component.editingProvider = {
                id: '',
                providerId: 'test',
                providerName: 'Test',
                baseUrl: 'https://test.com',
                apiVersion: 'v1',
                isEnabled: true,
                priority: 10,
            };
            (component as any).formModel.set({
                providerId: 'test',
                providerName: 'Test',
                baseUrl: 'https://test.com',
                apiVersion: 'v1',
                priority: '10',
                providerApiKey: 'key',
                isEnabled: true,
            });

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockProviderService.updateProvider).not.toHaveBeenCalled();
        });

        it('should not close modal if save fails', async () => {
            // Arrange
            component.isNewProvider = true;
            component.editingProvider = {
                id: '',
                providerId: 'test',
                providerName: 'Test',
                baseUrl: 'https://test.com',
                apiVersion: 'v1',
                isEnabled: true,
                priority: 10,
            };
            (component as any).formModel.set({
                providerId: 'test',
                providerName: 'Test',
                baseUrl: 'https://test.com',
                apiVersion: 'v1',
                priority: '10',
                providerApiKey: 'key',
                isEnabled: true,
            });
            mockProviderService.createProvider.mockReturnValue(Promise.resolve(undefined));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockModal.close).not.toHaveBeenCalled();
        });
    });

    describe('Form Validation', () => {
        beforeEach(() => {
            component.editingProvider = {
                id: '1',
                providerId: 'test',
                providerName: 'Test Provider',
                baseUrl: 'https://api.test.com',
                apiVersion: 'v1',
                isEnabled: true,
                priority: 10,
            };
            (component as any).formModel.set({
                providerId: 'test',
                providerName: 'Test Provider',
                baseUrl: 'https://api.test.com',
                apiVersion: 'v1',
                priority: '10',
                providerApiKey: 'test-key',
                isEnabled: true,
            });
        });

        it('should validate complete provider', () => {
            // Assert
            expect(component.isFormValid()).toBe(true);
        });

        it('should fail validation if providerName is missing', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, providerName: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should fail validation if baseUrl is missing', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, baseUrl: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should fail validation if apiKey is missing', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, providerApiKey: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should require providerId for new providers', () => {
            // Arrange
            component.isNewProvider = true;
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, providerId: '' });

            // Assert
            expect(component.isFormValid()).toBe(false);
        });

        it('should not require providerId for existing providers', () => {
            // Arrange
            component.isNewProvider = false;
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, providerId: '' });

            // Assert
            expect(component.isFormValid()).toBe(true);
        });

        it('should return validation error messages', () => {
            // Arrange
            const current = (component as any).formModel();
            (component as any).formModel.set({ ...current, providerName: '', providerApiKey: '' });

            // Act
            const errors = component.getValidationErrors();

            // Assert
            expect(errors.length).toBeGreaterThan(0);
            expect(mockTranslateService.instant).toHaveBeenCalled();
        });
    });

    describe('Helper Methods', () => {
        it('should generate provider class name', () => {
            const className = component.getProviderClass('OpenAI');

            expect(className).toBe('provider-openai');
        });

        it('should determine status class', () => {
            expect(component.getStatusClass(true, true)).toBe('status-enabled');
            expect(component.getStatusClass(false, true)).toBe('status-disabled');
            expect(component.getStatusClass(true, false)).toBe('status-no-key');
        });

        it('should get status text', () => {
            component.getStatusText(true, true);
            expect(mockTranslateService.instant).toHaveBeenCalledWith('settings.llm-providers.status.enabled');

            component.getStatusText(false, true);
            expect(mockTranslateService.instant).toHaveBeenCalledWith('settings.llm-providers.status.disabled');

            component.getStatusText(true, false);
            expect(mockTranslateService.instant).toHaveBeenCalledWith('settings.llm-providers.status.no-key');
        });

        it('should check if provider has API key', () => {
            const providerWithKey = mockProviders[0];
            const providerWithoutKey = mockProviders[2];

            expect(component.hasApiKey(providerWithKey)).toBe(true);
            expect(component.hasApiKey(providerWithoutKey)).toBe(false);
        });

        it('should determine if provider can be deleted', () => {
            mockLLMService.getDefaultModel.mockReturnValue({
                id: '1',
                modelId: 'test',
                apiModelId: 'test',
                modelName: 'Test',
                providerId: 'openai',
                contextWindow: 4096,
                maxTokens: 4096,
                costPerInputToken: 0.01,
                costPerOutputToken: 0.02,
                isEnabled: true,
                isDefault: true,
                capabilities: ['chat'],
            });

            const canDeleteOpenAI = component.canDeleteProvider(mockProviders[0]);
            const canDeleteAnthropic = component.canDeleteProvider(mockProviders[1]);

            expect(canDeleteOpenAI).toBe(false);
            expect(canDeleteAnthropic).toBe(true);
        });

        it('should allow deletion if no default model exists', () => {
            mockLLMService.getDefaultModel.mockReturnValue(undefined);

            const canDelete = component.canDeleteProvider(mockProviders[0]);

            expect(canDelete).toBe(true);
        });
    });

});
