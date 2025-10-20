/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementLLMService } from 'src/app/domain/services/llm/data-management-llm.service';
import { ILLMModel } from 'src/app/infrastructure/api/data-llm.service';
import { DataManagementLLMProviderService } from 'src/app/domain/services/llm/data-management-llm-provider.service';
import { ILLMProvider } from 'src/app/infrastructure/api/data-llm-provider.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LLMModelsHeaderComponent } from './llm-models-header/llm-models-header.component';
import { LLMModelsRowComponent } from './llm-models-row/llm-models-row.component';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DeletewindowComponent } from 'src/app/presentation/modal/deletewindow/deletewindow.component';

@Component({
  selector: 'app-llm-models',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    LLMModelsHeaderComponent,
    LLMModelsRowComponent,
  ],
  templateUrl: './llm-models.component.html',
  styleUrls: ['./llm-models.component.scss'],
})
export class LLMModelsComponent implements OnInit, OnDestroy {
  @ViewChild('llmModal', { read: TemplateRef }) llmModal!: TemplateRef<any>;
  @ViewChild('llmForm') llmForm!: NgForm;

  private llmService = inject(DataManagementLLMService);
  private providerService = inject(DataManagementLLMProviderService);
  private toastService = inject(ToastShowService);
  private modalService = inject(NgbModal);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  models: ILLMModel[] = [];
  availableProviders: ILLMProvider[] = [];
  isLoading = false;
  editingModel: ILLMModel | null = null;
  private originalModel: ILLMModel | null = null;

  providerApiKey = '';
  isNewModel = false;
  private isSaving = false;

  ngOnInit(): void {
    this.loadModels();
    this.loadProviders();
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
        },
        error: (error) => {
          console.error('Error loading LLM models:', error);
          this.toastService.showError('settings.llm-models.error.load-models');
          this.isLoading = false;
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
        },
        error: (error) => {
          console.error('Error loading providers:', error);
          // Fallback zu hardcoded Provider-Liste
          this.availableProviders = [
            {
              providerId: 'openai',
              providerName: 'OpenAI',
              isEnabled: true,
            } as ILLMProvider,
            {
              providerId: 'anthropic',
              providerName: 'Anthropic',
              isEnabled: true,
            } as ILLMProvider,
            {
              providerId: 'google',
              providerName: 'Google',
              isEnabled: true,
            } as ILLMProvider,
            {
              providerId: 'deepseek',
              providerName: 'DeepSeek',
              isEnabled: true,
            } as ILLMProvider,
          ];
        },
      });
  }

  onClickAdd(): void {
    this.isNewModel = true;
    this.providerApiKey = '';
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

    this.originalModel = null;

    setTimeout(() => {
      this.modalService.open(this.llmModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveModel();
    if (success) {
      modal.close();
    }
  }

  onClickEdit(model: ILLMModel): void {
    this.isNewModel = false;
    this.editingModel = { ...model };
    this.originalModel = model;
    this.providerApiKey = '';

    this.modalService.open(this.llmModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  async onClickDelete(index: number): Promise<void> {
    if (index >= 0 && index < this.models.length) {
      const model = this.models[index];

      if (model) {
        const modalRef = this.modalService.open(DeletewindowComponent, {
          size: 'md',
          backdrop: 'static',
        });

        modalRef.componentInstance.title = this.translate.instant(
          'settings.llm-models.delete.title'
        );
        modalRef.componentInstance.message = this.translate.instant(
          'settings.llm-models.confirm-delete',
          { name: model.displayName || model.modelName }
        );

        modalRef.result.then(
          async (result) => {
            if (result === 'delete') {
              try {
                if (!model.id) {
                  this.toastService.showError(
                    'settings.llm-models.error.missing-id'
                  );
                  console.error('Model is missing ID field:', model);
                  return;
                }
                await firstValueFrom(this.llmService.deleteModel(model.id));

                this.models.splice(index, 1);
                this.toastService.showSuccess(
                  'settings.llm-models.success.delete',
                  'Success'
                );
              } catch (error) {
                console.error('Error deleting model:', error);
                this.toastService.showError('settings.llm-models.error.delete');
              }
            }
          },
          () => {}
        );
      }
    }
  }

  private async saveModel(): Promise<boolean> {
    if (!this.editingModel || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.isSaving = true;

    try {
      if (this.providerApiKey.trim()) {
        this.editingModel.providerApiKey = this.providerApiKey;
      }

      if (this.originalModel) {
        const updatedModel = { ...this.originalModel, ...this.editingModel };
        await firstValueFrom(this.llmService.updateModel(updatedModel));
        this.toastService.showSuccess(
          'settings.llm-models.success.update',
          'Success'
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
            'settings.llm-models.success.create',
            'Success'
          );
        }
      }

      if (this.llmForm) {
        this.llmForm.form.markAsPristine();
      }
      return true;
    } catch (error) {
      console.error('Error saving model:', error);
      this.toastService.showError('settings.llm-models.error.save');
      this.loadModels();
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  isFormValid(): boolean {
    if (!this.editingModel) return false;

    return !!(
      this.editingModel.modelId &&
      this.editingModel.modelName &&
      this.editingModel.apiModelId &&
      this.editingModel.providerId &&
      this.editingModel.contextWindow > 0 &&
      this.editingModel.maxTokens > 0 &&
      this.editingModel.costPerInputToken >= 0 &&
      this.editingModel.costPerOutputToken >= 0
    );
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.editingModel) return errors;

    if (!this.editingModel.modelId) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.model-id-required'
        )
      );
    }
    if (!this.editingModel.modelName) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.display-name-required'
        )
      );
    }
    if (!this.editingModel.apiModelId) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.api-model-id-required'
        )
      );
    }
    if (!this.editingModel.providerId) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.provider-required'
        )
      );
    }
    if (this.editingModel.contextWindow <= 0) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.context-window-positive'
        )
      );
    }
    if (this.editingModel.maxTokens <= 0) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.max-tokens-positive'
        )
      );
    }
    if (
      this.isNewModel &&
      this.isProviderApiKeyEditable() &&
      !this.providerApiKey.trim()
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

    const needsApiKey = ['openai', 'anthropic', 'google'].includes(
      this.editingModel.providerId
    );

    if (this.isNewModel && needsApiKey) {
      return true;
    }

    return needsApiKey && this.providerApiKey.length > 0;
  }
}
