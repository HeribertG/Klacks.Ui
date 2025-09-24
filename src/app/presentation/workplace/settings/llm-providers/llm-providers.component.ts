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
import { Subject } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { LLMProvidersHeaderComponent } from './llm-providers-header/llm-providers-header.component';
import { LLMProvidersRowComponent } from './llm-providers-row/llm-providers-row.component';

export interface ILLMProvider {
  id?: string;
  providerId: string;
  providerName: string;
  isEnabled: boolean;
  hasApiKey: boolean;
  baseUrl?: string;
  apiVersion?: string;
  priority: number;
  apiKey?: string;
}

@Component({
  selector: 'app-llm-providers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    LLMProvidersHeaderComponent,
    LLMProvidersRowComponent,
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
  private destroy$ = new Subject<void>();

  providers: ILLMProvider[] = [];
  isLoading = false;
  editingProvider: ILLMProvider | null = null;
  private originalProvider: ILLMProvider | null = null;

  providerApiKey = '';
  isNewProvider = false;

  ngOnInit(): void {
    this.loadProviders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProviders(): void {
    this.isLoading = true;
    // TODO: Implement API call to get providers
    // This would be similar to DataManagementLLMService.getAvailableModels()
    // but for providers: GET /api/v1/backend/assistant/providers

    // Mock data for now
    this.providers = [
      {
        id: '1',
        providerId: 'openai',
        providerName: 'OpenAI',
        isEnabled: true,
        hasApiKey: true,
        baseUrl: 'https://api.openai.com/v1/',
        priority: 1,
      },
      {
        id: '2',
        providerId: 'anthropic',
        providerName: 'Anthropic',
        isEnabled: false,
        hasApiKey: false,
        baseUrl: 'https://api.anthropic.com/v1/',
        priority: 2,
      },
    ];
    this.isLoading = false;
  }

  onClickEdit(provider: ILLMProvider): void {
    this.isNewProvider = false;
    this.editingProvider = { ...provider };
    this.originalProvider = provider;
    this.providerApiKey = '';

    this.modalService.open(this.providerModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  async onClickToggleEnable(index: number): Promise<void> {
    if (index >= 0 && index < this.providers.length) {
      const provider = this.providers[index];

      if (provider) {
        try {
          if (provider.isEnabled) {
            // Disable provider
            // await this.providerService.disableProvider(provider.id).toPromise();
            provider.isEnabled = false;
            this.toastService.showSuccess(
              'settings.llm-providers.success.disable',
              'Success'
            );
          } else {
            // Check if provider has API key before enabling
            if (!provider.hasApiKey) {
              this.toastService.showError(
                'settings.llm-providers.error.no-api-key'
              );
              return;
            }

            // Enable provider
            // await this.providerService.enableProvider(provider.id).toPromise();
            provider.isEnabled = true;
            this.toastService.showSuccess(
              'settings.llm-providers.success.enable',
              'Success'
            );
          }

          this.onIsChanging(true);
        } catch (error) {
          console.error('Error toggling provider status:', error);
          this.toastService.showError('settings.llm-providers.error.toggle');
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

    try {
      if (this.providerApiKey.trim()) {
        // Update API key
        // await this.providerService.setApiKey(this.editingProvider.id, this.providerApiKey).toPromise();

        const updatedProvider = {
          ...this.originalProvider!,
          ...this.editingProvider,
        };
        updatedProvider.hasApiKey = true;
        updatedProvider.apiKey = this.providerApiKey;

        // Update local state
        const index = this.providers.findIndex(
          (p) => p.id === updatedProvider.id
        );
        if (index >= 0) {
          this.providers[index] = updatedProvider;
        }

        this.toastService.showSuccess(
          'settings.llm-providers.success.update',
          'Success'
        );
      }

      this.onIsChanging(true);
      modal.close();
    } catch (error) {
      console.error('Error saving provider:', error);
      this.toastService.showError('settings.llm-providers.error.save');
    }
  }

  isFormValid(): boolean {
    if (!this.editingProvider) return false;

    return !!(
      this.editingProvider.providerName &&
      this.editingProvider.baseUrl &&
      this.providerApiKey.trim()
    );
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.editingProvider) return errors;

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
}
