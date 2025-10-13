/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  TemplateRef,
  ViewChild,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { DeletewindowComponent } from 'src/app/presentation/modal/deletewindow/deletewindow.component';

@Component({
  selector: 'app-llm-providers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    LLMProvidersRowComponent,
    LLMProvidersHeaderComponent,
  ],
  templateUrl: './llm-providers.component.html',
  styleUrls: ['./llm-providers.component.scss'],
})
export class LLMProvidersComponent implements OnInit, OnDestroy {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @ViewChild('providerModal', { read: TemplateRef })
  providerModal!: TemplateRef<any>;

  private toastService = inject(ToastShowService);
  private modalService = inject(NgbModal);
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
  providerToDelete: ILLMProvider | null = null;

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

    this.modalService.open(this.providerModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  onClickEdit(provider: ILLMProvider): void {
    this.isNewProvider = false;
    this.editingProvider = { ...provider };
    this.originalProvider = provider;
    this.providerApiKey = provider.apiKey || '';

    this.modalService.open(this.providerModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  onClickDelete(provider: ILLMProvider): void {
    this.providerToDelete = provider;
    
    const modalRef = this.modalService.open(DeletewindowComponent, {
      size: 'md',
      backdrop: 'static'
    });

    modalRef.componentInstance.title = this.translate.instant('settings.llm-providers.delete.title');
    modalRef.componentInstance.message = this.translate.instant(
      'settings.llm-providers.delete.message',
      { providerName: provider.providerName }
    );

    modalRef.result.then(
      (result) => {
        if (result === 'delete' && this.providerToDelete?.id) {
          this.confirmDelete();
        }
      },
      () => {
        this.providerToDelete = null;
      }
    );
  }

  async onClickToggleEnable(index: number): Promise<void> {
    if (index >= 0 && index < this.providers.length) {
      const provider = this.providers[index];

      if (provider && provider.id) {
        const success = await this.providerService.toggleProviderStatus(
          provider.id, 
          !provider.isEnabled
        );
        
        if (success) {
          this.onIsChanging(true);
        }
      }
    }
  }

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }

  async onSave(modal: any): Promise<void> {
    if (!this.editingProvider || !this.isFormValid()) {
      return;
    }

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
        this.onIsChanging(true);
        // Models neu laden da neuer Provider erstellt wurde
        this.llmService.reloadModels();
        modal.close();
      }
    } else {
      if (!this.editingProvider.id) {
        return;
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
        this.onIsChanging(true);
        // Models neu laden da Provider geändert wurde
        this.llmService.reloadModels();
        modal.close();
      }
    }
  }

  canDeleteProvider(provider: ILLMProvider): boolean {
    const defaultModel = this.llmService.getDefaultModel();
    return !defaultModel || defaultModel.providerId !== provider.providerId;
  }

  private async confirmDelete(): Promise<void> {
    if (!this.providerToDelete?.id) {
      return;
    }

    const success = await this.providerService.deleteProvider(this.providerToDelete.id);
    if (success) {
      this.onIsChanging(true);
    }
    this.providerToDelete = null;
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
