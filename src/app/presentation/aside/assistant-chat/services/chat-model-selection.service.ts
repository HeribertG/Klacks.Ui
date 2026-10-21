// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * LLM model choice of one assistant chat instance: the enabled models, the selected one, whether
 * the model and provider lists are still loading and whether the selected model lacks an API key.
 * @param modelId - Model chosen in the selector, see selectModel
 */
import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';

const COST_DECIMALS = 4;

@Injectable()
export class ChatModelSelectionService {
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly assistantProviderService = inject(DataManagementAssistantProviderService);

  readonly availableModels = computed(() =>
    this.assistantService.availableModels().filter((m) => m.isEnabled),
  );
  readonly currentModel = linkedSignal(() => this.assistantService.selectedModelId());

  readonly isInitializing = computed(
    () => !this.assistantService.modelsInitialized() || !this.assistantProviderService.providersInitialized(),
  );

  readonly hasNoApiKey = computed(() =>
    this.isInitializing() ? false : this.noApiKeyForSelectedModel(),
  );

  selectModel(modelId: string): void {
    this.assistantService.setCurrentModel(modelId);
    this.currentModel.set(modelId);
    this.assistantService.warmupCache();
  }

  getCurrentModelInfo(): IAssistantModel | undefined {
    return this.assistantService.getModelInfo(this.currentModel());
  }

  formatCost(cost: number): string {
    return `€${cost.toFixed(COST_DECIMALS)}/1K tokens`;
  }

  /**
   * Single source for both the warning banner and the greeting gate, so the two can never
   * disagree: whenever the banner is up, greeting and toast stay away. Unlike hasNoApiKey it
   * carries no isInitializing() guard — callers decide themselves how to treat an unknown state.
   */
  noApiKeyForSelectedModel(): boolean {
    const providers = this.assistantProviderService.getCurrentProviders();
    if (!providers || providers.length === 0) return true;
    const currentModelInfo = this.availableModels().find((m) => m.modelId === this.currentModel());
    if (currentModelInfo) {
      const provider = providers.find((p) => p.providerId === currentModelInfo.providerId);
      return !provider?.hasApiKey;
    }
    return !providers.some((p) => p.hasApiKey);
  }
}
