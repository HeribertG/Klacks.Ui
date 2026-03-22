// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component, ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { IAssistantProvider } from 'src/app/infrastructure/api/assistant/data-assistant-provider.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LLMModelsHeaderComponent } from './llm-models-header/llm-models-header.component';
import { LLMModelsRowComponent } from './llm-models-row/llm-models-row.component';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

interface LLMModelFormModel {
  modelId: string;
  modelName: string;
  providerId: string;
  description: string;
  apiModelId: string;
  contextWindow: string;
  maxTokens: string;
  costPerInputToken: string;
  costPerOutputToken: string;
  providerApiKey: string;
  isEnabled: boolean;
  isDefault: boolean;
}

@Component({
  selector: 'app-llm-models',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    LLMModelsHeaderComponent,
    LLMModelsRowComponent,
    SettingsListCardComponent,
  ],
  templateUrl: './llm-models.component.html',
  styleUrls: ['./llm-models.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LLMModelsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('llmModal', { read: TemplateRef }) llmModal!: TemplateRef<any>;

  private llmService = inject(DataManagementAssistantService);
  private providerService = inject(DataManagementAssistantProviderService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  models: IAssistantModel[] = [];
  availableProviders: IAssistantProvider[] = [];
  isLoading = false;
  editingModel: IAssistantModel | null = null;
  private originalModel: IAssistantModel | null = null;

  isNewModel = false;
  message = DomainMessages.DELETE_ENTRY;
  private isSaving = false;

  private formModel = signal<LLMModelFormModel>({
    modelId: '',
    modelName: '',
    providerId: 'openai',
    description: '',
    apiModelId: '',
    contextWindow: '4096',
    maxTokens: '4096',
    costPerInputToken: '0.001',
    costPerOutputToken: '0.002',
    providerApiKey: '',
    isEnabled: true,
    isDefault: false,
  });

  llmForm = form(this.formModel, f => {
    debounce(f.modelId, 300);
    debounce(f.modelName, 300);
    debounce(f.providerId, 300);
    debounce(f.description, 300);
    debounce(f.apiModelId, 300);
    debounce(f.contextWindow, 300);
    debounce(f.maxTokens, 300);
    debounce(f.costPerInputToken, 300);
    debounce(f.costPerOutputToken, 300);
    debounce(f.providerApiKey, 300);
  });

  ngOnInit(): void {
    this.loadModels();
    this.loadProviders();
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'llm-models'
        ) {
          this.deleteModel(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadModels(): void {
    this.isLoading = true;
    this.llmService
      .getAvailableModels()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (models) => {
          this.models = models;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading LLM models:', error);
          this.toastService.showError(this.translate.instant('settings.llm-models.error.load-models'));
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private loadProviders(): void {
    this.providerService
      .getProviders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (providers) => {
          this.availableProviders = providers.filter((p) => p.isEnabled);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading providers:', error);
          // Fallback zu hardcoded Provider-Liste
          this.availableProviders = [
            {
              providerId: 'openai',
              providerName: 'OpenAI',
              isEnabled: true,
            } as IAssistantProvider,
            {
              providerId: 'anthropic',
              providerName: 'Anthropic',
              isEnabled: true,
            } as IAssistantProvider,
            {
              providerId: 'google',
              providerName: 'Google',
              isEnabled: true,
            } as IAssistantProvider,
            {
              providerId: 'deepseek',
              providerName: 'DeepSeek',
              isEnabled: true,
            } as IAssistantProvider,
          ];
          this.cdr.markForCheck();
        },
      });
  }

  onClickAdd(): void {
    this.isNewModel = true;
    this.editingModel = {
      modelId: '',
      apiModelId: '',
      providerId: 'openai',
      modelName: '',
      description: '',
      contextWindow: 4096,
      maxTokens: 4096,
      costPerInputToken: 0.001,
      costPerOutputToken: 0.002,
      isEnabled: true,
      isDefault: false,
      capabilities: ['chat'],
    };

    this.initFormFromModel(this.editingModel);
    this.originalModel = null;

    setTimeout(() => {
      this.ngbModal.open(this.llmModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  private initFormFromModel(model: IAssistantModel): void {
    this.formModel.set({
      modelId: model.modelId || '',
      modelName: model.modelName || '',
      providerId: model.providerId || 'openai',
      description: model.description || '',
      apiModelId: model.apiModelId || '',
      contextWindow: String(model.contextWindow || 4096),
      maxTokens: String(model.maxTokens || 4096),
      costPerInputToken: String(model.costPerInputToken || 0.001),
      costPerOutputToken: String(model.costPerOutputToken || 0.002),
      providerApiKey: '',
      isEnabled: model.isEnabled ?? true,
      isDefault: model.isDefault ?? false,
    });
  }

  private applyFormToModel(): void {
    if (!this.editingModel) return;
    const formData = this.formModel();
    this.editingModel.modelId = formData.modelId;
    this.editingModel.modelName = formData.modelName;
    this.editingModel.providerId = formData.providerId;
    this.editingModel.description = formData.description;
    this.editingModel.apiModelId = formData.apiModelId;
    this.editingModel.contextWindow = parseInt(formData.contextWindow, 10) || 4096;
    this.editingModel.maxTokens = parseInt(formData.maxTokens, 10) || 4096;
    this.editingModel.costPerInputToken = parseFloat(formData.costPerInputToken) || 0;
    this.editingModel.costPerOutputToken = parseFloat(formData.costPerOutputToken) || 0;
    this.editingModel.isEnabled = formData.isEnabled;
    this.editingModel.isDefault = formData.isDefault;
    if (formData.providerApiKey.trim()) {
      this.editingModel.providerApiKey = formData.providerApiKey;
    }
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveModel();
    if (success) {
      modal.close();
    }
  }

  onClickEdit(model: IAssistantModel): void {
    this.isNewModel = false;
    this.editingModel = { ...model };
    this.originalModel = model;
    this.initFormFromModel(this.editingModel);

    setTimeout(() => {
      this.ngbModal.open(this.llmModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  openDeleteModel(model: IAssistantModel): void {
    if (model.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'llm-models';

      this.modalService.Filing = model.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteModel(id: string): Promise<void> {
    try {
      await firstValueFrom(this.llmService.deleteModel(id));

      const index = this.models.findIndex(m => m.id === id);
      if (index !== -1) {
        this.models.splice(index, 1);
      }
      this.cdr.markForCheck();

      this.toastService.showSuccess(
        this.translate.instant('settings.llm-models.success.delete'),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch (error) {
      console.error('Error deleting model:', error);
      this.toastService.showError(this.translate.instant('settings.llm-models.error.delete'));
      this.cdr.markForCheck();
    }
  }

  private async saveModel(): Promise<boolean> {
    if (!this.editingModel || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.applyFormToModel();
    this.isSaving = true;

    try {
      if (this.originalModel) {
        const updatedModel = { ...this.originalModel, ...this.editingModel };
        await firstValueFrom(this.llmService.updateModel(updatedModel));
        this.toastService.showSuccess(
          this.translate.instant('settings.llm-models.success.update'),
          this.translate.instant('TOAST_SUCCESS')
        );
      } else {
        const createdModel = await firstValueFrom(
          this.llmService.createModel(this.editingModel)
        );
        if (createdModel) {
          this.models.push(createdModel);
          this.isNewModel = false;
          this.editingModel = createdModel;
          this.originalModel = createdModel;
          this.toastService.showSuccess(
            this.translate.instant('settings.llm-models.success.create'),
            this.translate.instant('TOAST_SUCCESS')
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving model:', error);
      this.toastService.showError(this.translate.instant('settings.llm-models.error.save'));
      this.loadModels();
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  isFormValid(): boolean {
    if (!this.editingModel) return false;
    const formData = this.formModel();

    const contextWindow = parseInt(formData.contextWindow, 10);
    const maxTokens = parseInt(formData.maxTokens, 10);
    const costPerInputToken = parseFloat(formData.costPerInputToken);
    const costPerOutputToken = parseFloat(formData.costPerOutputToken);

    return !!(
      formData.modelId &&
      formData.modelName &&
      formData.apiModelId &&
      formData.providerId &&
      contextWindow > 0 &&
      maxTokens > 0 &&
      costPerInputToken >= 0 &&
      costPerOutputToken >= 0
    );
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.editingModel) return errors;

    const formData = this.formModel();
    const contextWindow = parseInt(formData.contextWindow, 10);
    const maxTokens = parseInt(formData.maxTokens, 10);

    if (!formData.modelId) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.model-id-required'
        )
      );
    }
    if (!formData.modelName) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.display-name-required'
        )
      );
    }
    if (!formData.apiModelId) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.api-model-id-required'
        )
      );
    }
    if (!formData.providerId) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.provider-required'
        )
      );
    }
    if (isNaN(contextWindow) || contextWindow <= 0) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.context-window-positive'
        )
      );
    }
    if (isNaN(maxTokens) || maxTokens <= 0) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.max-tokens-positive'
        )
      );
    }
    if (
      this.isNewModel &&
      this.isProviderApiKeyEditable() &&
      !formData.providerApiKey.trim()
    ) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.api-key-required'
        )
      );
    }

    return errors;
  }

  formatCost(cost: number): string {
    return `€${cost.toFixed(4)}/1K`;
  }

  getProviderClass(provider: string): string {
    return `provider-${provider.toLowerCase()}`;
  }

  isProviderApiKeyEditable(): boolean {
    if (!this.editingModel) return false;
    const formData = this.formModel();

    const needsApiKey = ['openai', 'anthropic', 'google'].includes(
      formData.providerId
    );

    if (this.isNewModel && needsApiKey) {
      return true;
    }

    return needsApiKey && formData.providerApiKey.length > 0;
  }
}
