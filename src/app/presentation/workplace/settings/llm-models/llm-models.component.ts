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
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementLLMService } from 'src/app/domain/services/data-management-llm.service';
import { ILLMModel } from 'src/app/infrastructure/api/data-llm.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LLMModelsHeaderComponent } from './llm-models-header/llm-models-header.component';
import { LLMModelsRowComponent } from './llm-models-row/llm-models-row.component';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

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
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @ViewChild('llmModal', { read: TemplateRef }) llmModal!: TemplateRef<any>;

  private llmService = inject(DataManagementLLMService);
  private toastService = inject(ToastShowService);
  private modalService = inject(NgbModal);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  models: ILLMModel[] = [];
  isLoading = false;
  editingModel: ILLMModel | null = null;
  private originalModel: ILLMModel | null = null;

  providerApiKey = '';
  isNewModel = false;

  availableProviders = ['openai', 'anthropic', 'google', 'azure', 'local'];

  ngOnInit(): void {
    this.loadModels();
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

  onClickEdit(model: ILLMModel): void {
    // Clone the model for editing
    this.isNewModel = false;
    this.editingModel = { ...model };
    this.originalModel = model;
    this.providerApiKey = ''; // Don't pre-fill for security

    this.modalService.open(this.llmModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  async onClickDelete(index: number): Promise<void> {
    if (index >= 0 && index < this.models.length) {
      const model = this.models[index];

      if (model) {
        const confirmDelete = confirm(
          this.translate.instant('settings.llm-models.confirm-delete', {
            name: model.displayName,
          })
        );

        if (confirmDelete) {
          try {
            await firstValueFrom(this.llmService.deleteModel(model.modelId));

            this.models.splice(index, 1);
            this.onIsChanging(true);
            this.toastService.showSuccess(
              'settings.llm-models.success.delete',
              'Success'
            );
          } catch (error) {
            console.error('Error deleting model:', error);
            this.toastService.showError('settings.llm-models.error.delete');
          }
        }
      }
    }
  }

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }

  async onSave(modal: any): Promise<void> {
    if (!this.editingModel || !this.isFormValid()) {
      return;
    }

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
        this.models.push(createdModel || this.editingModel);
        this.toastService.showSuccess(
          'settings.llm-models.success.create',
          'Success'
        );
      }

      this.onIsChanging(true);
      modal.close();
    } catch (error) {
      console.error('Error saving model:', error);
      this.toastService.showError('settings.llm-models.error.save');

      this.loadModels();
    }
  }

  isFormValid(): boolean {
    if (!this.editingModel) return false;

    return !!(
      this.editingModel.modelId &&
      this.editingModel.modelName &&
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
    if (!this.editingModel.displayName) {
      errors.push(
        this.translate.instant(
          'settings.llm-models.validation.display-name-required'
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
