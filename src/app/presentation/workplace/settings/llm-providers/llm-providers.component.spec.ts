import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { LLMProvidersComponent } from './llm-providers.component';
import { DataManagementLLMProviderService } from 'src/app/domain/services/data-management-llm-provider.service';
import { DataManagementLLMService } from 'src/app/domain/services/data-management-llm.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ILLMProvider } from 'src/app/infrastructure/api/data-llm-provider.service';
import { signal } from '@angular/core';

describe('LLMProvidersComponent', () => {
  let component: LLMProvidersComponent;
  let fixture: ComponentFixture<LLMProvidersComponent>;
  let mockProviderService: jasmine.SpyObj<DataManagementLLMProviderService>;
  let mockLLMService: jasmine.SpyObj<DataManagementLLMService>;
  let mockToastService: jasmine.SpyObj<ToastShowService>;
  let mockModalService: jasmine.SpyObj<NgbModal>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

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
    const providerServiceSpy = jasmine.createSpyObj(
      'DataManagementLLMProviderService',
      [
        'loadProviders',
        'createProvider',
        'updateProvider',
        'deleteProvider',
        'toggleProviderStatus',
      ],
      {
        providers$: of(mockProviders),
        isLoading: signal(false),
      }
    );

    const llmServiceSpy = jasmine.createSpyObj('DataManagementLLMService', [
      'reloadModels',
      'getDefaultModel',
    ]);

    const toastServiceSpy = jasmine.createSpyObj('ToastShowService', [
      'showError',
      'showSuccess',
    ]);

    const modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    providerServiceSpy.loadProviders.and.returnValue(Promise.resolve());
    llmServiceSpy.getDefaultModel.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [LLMProvidersComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementLLMProviderService,
          useValue: providerServiceSpy,
        },
        { provide: DataManagementLLMService, useValue: llmServiceSpy },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: NgbModal, useValue: modalServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockProviderService = TestBed.inject(
      DataManagementLLMProviderService
    ) as jasmine.SpyObj<DataManagementLLMProviderService>;
    mockLLMService = TestBed.inject(
      DataManagementLLMService
    ) as jasmine.SpyObj<DataManagementLLMService>;
    mockToastService = TestBed.inject(
      ToastShowService
    ) as jasmine.SpyObj<ToastShowService>;
    mockModalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

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

    it('should subscribe to providers$', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.providers.length).toBe(3);
        expect(component.providers).toEqual(mockProviders);
        done();
      }, 50);
    });
  });

  describe('Add Provider', () => {
    it('should initialize new provider with default values', () => {
      component.onClickAdd();

      expect(component.isNewProvider).toBe(true);
      expect(component.editingProvider).toBeTruthy();
      expect(component.editingProvider?.providerId).toBe('');
      expect(component.editingProvider?.isEnabled).toBe(true);
      expect(component.editingProvider?.priority).toBe(10);
      expect(component.providerApiKey).toBe('');
    });
  });

  describe('Edit Provider', () => {
    it('should set editing provider and API key', () => {
      const providerToEdit = mockProviders[0];

      component.onClickEdit(providerToEdit);

      expect(component.isNewProvider).toBe(false);
      expect(component.editingProvider).toEqual(providerToEdit);
      expect(component.providerApiKey).toBe('sk-test123');
    });

    it('should handle provider without API key', () => {
      const providerWithoutKey = mockProviders[2];

      component.onClickEdit(providerWithoutKey);

      expect(component.providerApiKey).toBe('');
    });
  });

  describe('Delete Provider', () => {
    it('should set providerToDelete', () => {
      component.onClickDelete(mockProviders[0]);

      expect(component.providerToDelete).toEqual(mockProviders[0]);
    });
  });

  describe('Toggle Provider Status', () => {
    beforeEach(() => {
      component.providers = [...mockProviders];
    });

    it('should toggle provider status', async () => {
      mockProviderService.toggleProviderStatus.and.returnValue(
        Promise.resolve(true)
      );

      await component.onClickToggleEnable(0);

      expect(mockProviderService.toggleProviderStatus).toHaveBeenCalledWith(
        '1',
        false
      );
    });

    it('should emit isChangingEvent on successful toggle', async () => {
      spyOn(component.isChangingEvent, 'emit');
      mockProviderService.toggleProviderStatus.and.returnValue(
        Promise.resolve(true)
      );

      await component.onClickToggleEnable(0);

      expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
    });

    it('should not emit if toggle fails', async () => {
      spyOn(component.isChangingEvent, 'emit');
      mockProviderService.toggleProviderStatus.and.returnValue(
        Promise.resolve(false)
      );

      await component.onClickToggleEnable(0);

      expect(component.isChangingEvent.emit).not.toHaveBeenCalled();
    });

    it('should not toggle if index is invalid', async () => {
      await component.onClickToggleEnable(-1);

      expect(
        mockProviderService.toggleProviderStatus
      ).not.toHaveBeenCalled();
    });

    it('should not toggle if provider has no ID', async () => {
      const providerWithoutId = { ...mockProviders[0], id: undefined } as any;
      component.providers = [providerWithoutId];

      await component.onClickToggleEnable(0);

      expect(
        mockProviderService.toggleProviderStatus
      ).not.toHaveBeenCalled();
    });
  });

  describe('Save Provider', () => {
    let mockModal: any;

    beforeEach(() => {
      mockModal = { close: jasmine.createSpy('close') };
    });

    it('should create new provider', async () => {
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
      component.providerApiKey = 'new-api-key';
      mockProviderService.createProvider.and.returnValue(
        Promise.resolve(component.editingProvider)
      );

      await component.onSave(mockModal);

      expect(mockProviderService.createProvider).toHaveBeenCalled();
      expect(mockLLMService.reloadModels).toHaveBeenCalled();
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should update existing provider', async () => {
      component.isNewProvider = false;
      component.editingProvider = { ...mockProviders[0], priority: 5 };
      component.providerApiKey = 'updated-key';
      mockProviderService.updateProvider.and.returnValue(
        Promise.resolve(component.editingProvider)
      );

      await component.onSave(mockModal);

      expect(mockProviderService.updateProvider).toHaveBeenCalled();
      expect(mockLLMService.reloadModels).toHaveBeenCalled();
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should not save if form is invalid', async () => {
      component.editingProvider = {
        id: '',
        providerId: '',
        providerName: '',
        baseUrl: '',
        apiVersion: '',
        isEnabled: true,
        priority: 10,
      };
      component.providerApiKey = '';

      await component.onSave(mockModal);

      expect(mockProviderService.createProvider).not.toHaveBeenCalled();
      expect(mockProviderService.updateProvider).not.toHaveBeenCalled();
    });

    it('should not update provider without ID', async () => {
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
      component.providerApiKey = 'key';

      await component.onSave(mockModal);

      expect(mockProviderService.updateProvider).not.toHaveBeenCalled();
    });

    it('should not close modal if save fails', async () => {
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
      component.providerApiKey = 'key';
      mockProviderService.createProvider.and.returnValue(Promise.resolve(undefined));

      await component.onSave(mockModal);

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
      component.providerApiKey = 'test-key';
    });

    it('should validate complete provider', () => {
      expect(component.isFormValid()).toBe(true);
    });

    it('should fail validation if providerName is missing', () => {
      component.editingProvider!.providerName = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if baseUrl is missing', () => {
      component.editingProvider!.baseUrl = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if apiKey is missing', () => {
      component.providerApiKey = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should require providerId for new providers', () => {
      component.isNewProvider = true;
      component.editingProvider!.providerId = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should not require providerId for existing providers', () => {
      component.isNewProvider = false;
      component.editingProvider!.providerId = '';

      expect(component.isFormValid()).toBe(true);
    });

    it('should return validation error messages', () => {
      component.editingProvider!.providerName = '';
      component.providerApiKey = '';

      const errors = component.getValidationErrors();

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
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'settings.llm-providers.status.enabled'
      );

      component.getStatusText(false, true);
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'settings.llm-providers.status.disabled'
      );

      component.getStatusText(true, false);
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'settings.llm-providers.status.no-key'
      );
    });

    it('should check if provider has API key', () => {
      const providerWithKey = mockProviders[0];
      const providerWithoutKey = mockProviders[2];

      expect(component.hasApiKey(providerWithKey)).toBe(true);
      expect(component.hasApiKey(providerWithoutKey)).toBe(false);
    });

    it('should determine if provider can be deleted', () => {
      mockLLMService.getDefaultModel.and.returnValue({
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
      mockLLMService.getDefaultModel.and.returnValue(undefined);

      const canDelete = component.canDeleteProvider(mockProviders[0]);

      expect(canDelete).toBe(true);
    });
  });

  describe('Event Emitters', () => {
    it('should emit isChangingEvent', () => {
      spyOn(component.isChangingEvent, 'emit');

      component.onIsChanging(true);

      expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
    });
  });
});
