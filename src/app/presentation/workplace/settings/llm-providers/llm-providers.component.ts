/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
} from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { LLMProvidersHeaderComponent } from './llm-providers-header/llm-providers-header.component';
import { LLMProvidersRowComponent } from './llm-providers-row/llm-providers-row.component';
import { DataManagementLLMProviderService } from 'src/app/domain/services/llm/data-management-llm-provider.service';
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
import { ILLMProvider, ICreateProviderRequest } from 'src/app/infrastructure/api/data-llm-provider.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

@Component({
  selector: 'app-llm-providers',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    LLMProvidersRowComponent,
    LLMProvidersHeaderComponent
],
  templateUrl: './llm-providers.component.html',
  styleUrls: ['./llm-providers.component.scss'],
})
export class LLMProvidersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('providerModal', { read: TemplateRef })
  providerModal!: TemplateRef<any>;
  @ViewChild('providerForm') providerForm!: NgForm;

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

  providerApiKey = '';
  isNewProvider = false;
  message = MessageLibrary.DELETE_ENTRY;
  private isSaving = false;

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
    this.providerApiKey = '';

    this.ngbModal.open(this.providerModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  onClickEdit(provider: ILLMProvider): void {
    this.isNewProvider = false;
    this.editingProvider = { ...provider };
    this.originalProvider = provider;
    this.providerApiKey = provider.apiKey || '';

    this.ngbModal.open(this.providerModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
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

    this.isSaving = true;

    try {
      if (this.isNewProvider) {
        const createRequest: ICreateProviderRequest = {
          providerId: this.editingProvider.providerId,
          providerName: this.editingProvider.providerName,
          apiKey: this.providerApiKey.trim() || undefined,
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
          if (this.providerForm) {
            this.providerForm.form.markAsPristine();
          }
          return true;
        }
        return false;
      } else {
        if (!this.editingProvider.id) {
          return false;
        }

        const updateRequest = {
          apiKey: this.providerApiKey.trim() || undefined,
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
          if (this.providerForm) {
            this.providerForm.form.markAsPristine();
          }
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

    const baseValidation = !!(
      this.editingProvider.providerName &&
      this.editingProvider.baseUrl &&
      this.providerApiKey.trim()
    );

    if (this.isNewProvider) {
      return baseValidation && !!this.editingProvider.providerId;
    }

    return baseValidation;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.editingProvider) return errors;

    if (this.isNewProvider && !this.editingProvider.providerId) {
      errors.push(
        this.translate.instant(
          'settings.llm-providers.validation.provider-id-required'
        )
      );
    }
    if (!this.editingProvider.providerName) {
      errors.push(
        this.translate.instant(
          'settings.llm-providers.validation.provider-name-required'
        )
      );
    }
    if (!this.editingProvider.baseUrl) {
      errors.push(
        this.translate.instant(
          'settings.llm-providers.validation.base-url-required'
        )
      );
    }
    if (!this.providerApiKey.trim()) {
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
