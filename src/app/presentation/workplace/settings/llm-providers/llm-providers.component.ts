/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, Field, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { LLMProvidersHeaderComponent } from './llm-providers-header/llm-providers-header.component';
import { LLMProvidersRowComponent } from './llm-providers-row/llm-providers-row.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { DataManagementLLMProviderService } from 'src/app/domain/services/llm/data-management-llm-provider.service';
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
import { ILLMProvider, ICreateProviderRequest } from 'src/app/infrastructure/api/llm/data-llm-provider.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

interface LLMProviderFormModel {
  providerId: string;
  providerName: string;
  baseUrl: string;
  apiVersion: string;
  priority: string;
  providerApiKey: string;
  isEnabled: boolean;
}

@Component({
  selector: 'app-llm-providers',
  standalone: true,
  imports: [
    FormsModule,
    Field,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    LLMProvidersRowComponent,
    LLMProvidersHeaderComponent,
    SettingsListCardComponent,
  ],
  templateUrl: './llm-providers.component.html',
  styleUrls: ['./llm-providers.component.scss'],
})
export class LLMProvidersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('providerModal', { read: TemplateRef })
  providerModal!: TemplateRef<any>;

  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private providerService = inject(DataManagementLLMProviderService);
  private llmService = inject(DataManagementLLMService);
  private destroy$ = new Subject<void>();

  providers: ILLMProvider[] = [];
  isLoading = this.providerService.isLoading;
  editingProvider: ILLMProvider | null = null;
  private originalProvider: ILLMProvider | null = null;

  isNewProvider = false;
  message = MessageLibrary.DELETE_ENTRY;
  private isSaving = false;

  private formModel = signal<LLMProviderFormModel>({
    providerId: '',
    providerName: '',
    baseUrl: '',
    apiVersion: '',
    priority: '10',
    providerApiKey: '',
    isEnabled: true,
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
  }

  private setupProviderSubscription(): void {
    this.providerService.getProviders()
      .pipe(takeUntil(this.destroy$))
      .subscribe(providers => {
        this.providers = providers;
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
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      apiVersion: ''
    };
    this.originalProvider = null;
    this.initFormFromProvider(this.editingProvider);

    setTimeout(() => {
      this.ngbModal.open(this.providerModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  onClickEdit(provider: ILLMProvider): void {
    this.isNewProvider = false;
    this.editingProvider = { ...provider };
    this.originalProvider = provider;
    this.initFormFromProvider(this.editingProvider, provider.apiKey || '');

    setTimeout(() => {
      this.ngbModal.open(this.providerModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  private initFormFromProvider(provider: ILLMProvider, apiKey = ''): void {
    this.formModel.set({
      providerId: provider.providerId || '',
      providerName: provider.providerName || '',
      baseUrl: provider.baseUrl || '',
      apiVersion: provider.apiVersion || '',
      priority: String(provider.priority || 10),
      providerApiKey: apiKey,
      isEnabled: provider.isEnabled ?? true,
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
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveProvider();
    if (success) {
      modal.close();
    }
  }

  openDeleteProvider(provider: ILLMProvider): void {
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
    if (index >= 0 && index < this.providers.length) {
      const provider = this.providers[index];

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
          priority: this.editingProvider.priority
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
          priority: this.editingProvider.priority
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
    }
  }

  canDeleteProvider(provider: ILLMProvider): boolean {
    const defaultModel = this.llmService.getDefaultModel();
    return !defaultModel || defaultModel.providerId !== provider.providerId;
  }

  isFormValid(): boolean {
    if (!this.editingProvider) return false;
    const formData = this.formModel();

    const baseValidation = !!(
      formData.providerName &&
      formData.baseUrl &&
      formData.providerApiKey.trim()
    );

    if (this.isNewProvider) {
      return baseValidation && !!formData.providerId;
    }

    return baseValidation;
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
    if (!formData.providerApiKey.trim()) {
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

  hasApiKey(provider: ILLMProvider): boolean {
    return !!(provider.apiKey && provider.apiKey.trim());
  }
}
