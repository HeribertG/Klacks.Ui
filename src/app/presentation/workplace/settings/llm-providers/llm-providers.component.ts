// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for configuring LLM providers and models; API key entry is optional for keyless local providers.
 * @param requiresApiKey - Form flag controlling whether the API key field is mandatory
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component, ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  viewChild,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { LLMProvidersHeaderComponent } from './llm-providers-header/llm-providers-header.component';
import { LLMProvidersRowComponent } from './llm-providers-row/llm-providers-row.component';
import { LLMProvidersDiscoverComponent } from './llm-providers-discover/llm-providers-discover.component';
import { IDiscoveredProvider } from 'src/app/domain/models/assistant/discovered-provider';
import { RefreshButtonComponent } from 'src/app/presentation/shared/refresh-button/refresh-button.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantProvider, ICreateProviderRequest } from 'src/app/infrastructure/api/assistant/data-assistant-provider.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

const DEFAULT_PROVIDER_PRIORITY = 10;
const API_KEY_MASK_PLACEHOLDER = '••••••••';
const API_KEY_EXAMPLE_PLACEHOLDER = 'sk-...';
const API_KEY_NOT_REQUIRED_KEY = 'settings.llm-providers.api-key-not-required';

interface LLMProviderFormModel {
  providerId: string;
  providerName: string;
  baseUrl: string;
  apiVersion: string;
  priority: string;
  providerApiKey: string;
  isEnabled: boolean;
  requiresApiKey: boolean;
}

@Component({
  selector: 'app-llm-providers',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    LLMProvidersRowComponent,
    LLMProvidersHeaderComponent,
    LLMProvidersDiscoverComponent,
    RefreshButtonComponent,
    SettingsListCardComponent,
  ],
  templateUrl: './llm-providers.component.html',
  styleUrls: ['./llm-providers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LLMProvidersComponent implements OnInit, AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.LLM_PROVIDER;
  readonly providerModal = viewChild.required<TemplateRef<any>>('providerModal');
  readonly discoverModal = viewChild.required<TemplateRef<any>>('discoverModal');
  readonly discoverComponent = viewChild(LLMProvidersDiscoverComponent);

  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private providerService = inject(DataManagementAssistantProviderService);
  private llmService = inject(DataManagementAssistantService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;
  private destroy$ = new Subject<void>();

  providers = signal<IAssistantProvider[]>([]);
  searchTerm = signal('');
  filteredProviders = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.providers();
    return this.providers().filter(p =>
      (p.providerName ?? '').toLowerCase().includes(term) ||
      (p.providerId ?? '').toLowerCase().includes(term)
    );
  });
  isLoading = this.providerService.isLoading;
  isDiscovering = this.providerService.isDiscovering;
  selectedDiscoveredProviders = signal<IDiscoveredProvider[]>([]);
  editingProvider: IAssistantProvider | null = null;
  private originalProvider: IAssistantProvider | null = null;

  isNewProvider = false;
  message = DomainMessages.DELETE_ENTRY;
  private isSaving = false;

  private formModel = signal<LLMProviderFormModel>({
    providerId: '',
    providerName: '',
    baseUrl: '',
    apiVersion: '',
    priority: '10',
    providerApiKey: '',
    isEnabled: true,
    requiresApiKey: true,
  });

  providerForm = form(this.formModel, f => {
    debounce(f.providerId, 300);
    debounce(f.providerName, 300);
    debounce(f.baseUrl, 300);
    debounce(f.apiVersion, 300);
    debounce(f.priority, 300);
    debounce(f.providerApiKey, 300);
  });

  ngOnInit(): void {
    this.loadProviders();
    this.setupProviderSubscription();
    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  private setupProviderSubscription(): void {
    this.providerService.getProviders()
      .pipe(takeUntil(this.destroy$))
      .subscribe(providers => {
        this.providers.set(providers);
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'llm-providers'
        ) {
          this.deleteProvider(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    void this.loadProviders();
  }

  private async loadProviders(): Promise<void> {
    await this.providerService.loadProviders();
  }

  onClickAdd(): void {
    this.isNewProvider = true;
    this.editingProvider = {
      id: '',
      providerId: '',
      providerName: '',
      isEnabled: true,
      priority: 10,
      baseUrl: '',
      apiVersion: '',
      requiresApiKey: true
    };
    this.originalProvider = null;
    this.initFormFromProvider(this.editingProvider);

    setTimeout(() => {
      this.ngbModal.open(this.providerModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  openDiscoverModal(): void {
    this.selectedDiscoveredProviders.set([]);
    this.ngbModal.open(this.discoverModal(), {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
    setTimeout(() => this.discoverComponent()?.load(), 0);
  }

  onDiscoverSelectionChanged(candidates: IDiscoveredProvider[]): void {
    this.selectedDiscoveredProviders.set(candidates);
  }

  async onConfirmImport(modal: { close: () => void }): Promise<void> {
    await this.onImportSelected(this.selectedDiscoveredProviders());
    modal.close();
  }

  async onImportSelected(candidates: IDiscoveredProvider[]): Promise<void> {
    let importedAny = false;

    for (const candidate of candidates) {
      const createRequest: ICreateProviderRequest = {
        providerId: candidate.providerId,
        providerName: candidate.providerName,
        apiKey: undefined,
        baseUrl: candidate.baseUrl,
        apiVersion: candidate.apiVersion ?? undefined,
        isEnabled: false,
        priority: DEFAULT_PROVIDER_PRIORITY,
        requiresApiKey: candidate.requiresApiKey,
      };

      const created = await this.providerService.createProvider(createRequest);
      if (created) {
        importedAny = true;
      }
    }

    if (importedAny) {
      this.llmService.reloadModels();
    }

    this.cdr.markForCheck();
  }

  onClickEdit(provider: IAssistantProvider): void {
    this.isNewProvider = false;
    this.editingProvider = { ...provider };
    this.originalProvider = provider;
    this.initFormFromProvider(this.editingProvider, provider.apiKey || '');

    setTimeout(() => {
      this.ngbModal.open(this.providerModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  private initFormFromProvider(provider: IAssistantProvider, apiKey = ''): void {
    this.formModel.set({
      providerId: provider.providerId || '',
      providerName: provider.providerName || '',
      baseUrl: provider.baseUrl || '',
      apiVersion: provider.apiVersion || '',
      priority: String(provider.priority || 10),
      providerApiKey: apiKey,
      isEnabled: provider.isEnabled ?? true,
      requiresApiKey: provider.requiresApiKey ?? true,
    });
  }

  private applyFormToProvider(): void {
    if (!this.editingProvider) return;
    const formData = this.formModel();
    this.editingProvider.providerId = formData.providerId;
    this.editingProvider.providerName = formData.providerName;
    this.editingProvider.baseUrl = formData.baseUrl;
    this.editingProvider.apiVersion = formData.apiVersion;
    this.editingProvider.priority = parseInt(formData.priority, 10) || 10;
    this.editingProvider.isEnabled = formData.isEnabled;
    this.editingProvider.requiresApiKey = formData.requiresApiKey;
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveProvider();
    if (success) {
      modal.close();
    }
  }

  openDeleteProvider(provider: IAssistantProvider): void {
    if (provider.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'llm-providers';

      this.modalService.Filing = provider.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteProvider(id: string): Promise<void> {
    await this.providerService.deleteProvider(id);
  }

  async onClickToggleEnable(index: number): Promise<void> {
    const list = this.providers();
    if (index >= 0 && index < list.length) {
      const provider = list[index];

      if (provider && provider.id) {
        await this.providerService.toggleProviderStatus(
          provider.id,
          !provider.isEnabled
        );
      }
    }
  }

  private async saveProvider(): Promise<boolean> {
    if (!this.editingProvider || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.applyFormToProvider();
    const formData = this.formModel();
    this.isSaving = true;

    try {
      if (this.isNewProvider) {
        const createRequest: ICreateProviderRequest = {
          providerId: this.editingProvider.providerId,
          providerName: this.editingProvider.providerName,
          apiKey: formData.providerApiKey.trim() || undefined,
          baseUrl: this.editingProvider.baseUrl,
          apiVersion: this.editingProvider.apiVersion,
          isEnabled: this.editingProvider.isEnabled,
          priority: this.editingProvider.priority,
          requiresApiKey: this.editingProvider.requiresApiKey ?? true
        };

        const newProvider = await this.providerService.createProvider(createRequest);
        if (newProvider) {
          this.llmService.reloadModels();
          this.isNewProvider = false;
          this.editingProvider = newProvider;
          return true;
        }
        return false;
      } else {
        if (!this.editingProvider.id) {
          return false;
        }

        const updateRequest = {
          providerName: this.editingProvider.providerName,
          apiKey: formData.providerApiKey.trim() || undefined,
          baseUrl: this.editingProvider.baseUrl,
          apiVersion: this.editingProvider.apiVersion,
          isEnabled: this.editingProvider.isEnabled,
          priority: this.editingProvider.priority,
          requiresApiKey: this.editingProvider.requiresApiKey ?? true
        };

        const updatedProvider = await this.providerService.updateProvider(
          this.editingProvider.id,
          updateRequest
        );

        if (updatedProvider) {
          this.llmService.reloadModels();
          return true;
        }
        return false;
      }
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  canDeleteProvider(provider: IAssistantProvider): boolean {
    const defaultModel = this.llmService.getDefaultModel();
    return !defaultModel || defaultModel.providerId !== provider.providerId;
  }

  isApiKeyRequired(): boolean {
    return this.formModel().requiresApiKey !== false;
  }

  getApiKeyPlaceholder(): string {
    if (!this.isApiKeyRequired()) {
      return this.translate.instant(API_KEY_NOT_REQUIRED_KEY);
    }
    if (!this.isNewProvider && this.editingProvider?.hasApiKey) {
      return API_KEY_MASK_PLACEHOLDER;
    }
    return API_KEY_EXAMPLE_PLACEHOLDER;
  }

  isFormValid(): boolean {
    if (!this.editingProvider) return false;
    const formData = this.formModel();

    const hasRequiredFields = !!(formData.providerName && formData.baseUrl);
    const keyRequired = this.isApiKeyRequired();
    const hasKeyInput = !!formData.providerApiKey.trim();

    if (this.isNewProvider) {
      return hasRequiredFields && !!formData.providerId && (!keyRequired || hasKeyInput);
    }

    const apiKeyValid = !keyRequired || !!this.editingProvider.hasApiKey || hasKeyInput;
    return hasRequiredFields && apiKeyValid;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.editingProvider) return errors;

    const formData = this.formModel();

    if (this.isNewProvider && !formData.providerId) {
      errors.push(
        this.translate.instant(
          'settings.llm-providers.validation.provider-id-required'
        )
      );
    }
    if (!formData.providerName) {
      errors.push(
        this.translate.instant(
          'settings.llm-providers.validation.provider-name-required'
        )
      );
    }
    if (!formData.baseUrl) {
      errors.push(
        this.translate.instant(
          'settings.llm-providers.validation.base-url-required'
        )
      );
    }
    const needsApiKey =
      this.isApiKeyRequired() && (this.isNewProvider || !this.editingProvider?.hasApiKey);
    if (needsApiKey && !formData.providerApiKey.trim()) {
      errors.push(
        this.translate.instant(
          'settings.llm-providers.validation.api-key-required'
        )
      );
    }

    return errors;
  }

  getProviderClass(provider: string): string {
    return `provider-${provider.toLowerCase()}`;
  }

  getStatusClass(isEnabled: boolean, hasApiKey: boolean): string {
    if (isEnabled && hasApiKey) return 'status-enabled';
    if (!hasApiKey) return 'status-no-key';
    return 'status-disabled';
  }

  getStatusText(isEnabled: boolean, hasApiKey: boolean): string {
    if (!hasApiKey)
      return this.translate.instant('settings.llm-providers.status.no-key');
    return isEnabled
      ? this.translate.instant('settings.llm-providers.status.enabled')
      : this.translate.instant('settings.llm-providers.status.disabled');
  }

  hasApiKey(provider: IAssistantProvider): boolean {
    return !!provider.hasApiKey;
  }
}
