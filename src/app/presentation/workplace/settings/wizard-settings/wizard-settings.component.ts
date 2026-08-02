// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for the LLM-driven schedule harmonizer (Holistic Harmonizer).
 * Lets the operator pick which LLM model the wizard uses globally and run a one-click
 * compatibility check across all enabled models (latency + JSON-format compliance).
 */
import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataHolisticHarmonizerService } from 'src/app/infrastructure/api/holistic-harmonizer/data-holistic-harmonizer.service';
import { HolisticHarmonizerModelCheckDto } from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-run.model';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { filterModelsWithActiveProvider } from 'src/app/domain/services/assistant/assistant-model-provider-filter';

@Component({
  selector: 'app-wizard-settings',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './wizard-settings.component.html',
  styleUrls: ['./wizard-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardSettingsComponent implements OnInit {
  private readonly appSettingsService = inject(AppSettingsManagementService);
  private readonly dataAssistantService = inject(DataAssistantService);
  private readonly dataHolisticHarmonizerService = inject(DataHolisticHarmonizerService);
  private readonly assistantProviderService = inject(DataManagementAssistantProviderService);

  readonly llmModelId = signal<string>('');
  readonly llmModels = signal<{ value: string; label: string }[]>([]);
  readonly checkResults = signal<HolisticHarmonizerModelCheckDto[]>([]);
  readonly isChecking = signal<boolean>(false);
  readonly checkError = signal<string | null>(null);
  readonly loadModelsError = signal<string | null>(null);
  private isInitialized = false;

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    this.llmModelId.set(this.appSettingsService.holisticHarmonizerSettings().llmModelId);
    this.isInitialized = true;

    await this.loadLlmModels();
  }

  private async loadLlmModels(): Promise<void> {
    try {
      const [models, providers] = await Promise.all([
        firstValueFrom(this.dataAssistantService.getModels()),
        this.assistantProviderService.loadProviders(),
      ]);
      this.llmModels.set(
        filterModelsWithActiveProvider(
          models.filter((m) => m.isEnabled),
          providers,
        ).map((m) => ({ value: m.modelId, label: m.displayName ?? m.modelId })),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.loadModelsError.set(message);
      this.llmModels.set([]);
    }
  }

  onLlmModelChange(modelId: string): void {
    this.llmModelId.set(modelId);
    this.onSettingChanged();
  }

  onSettingChanged(): void {
    if (!this.isInitialized) {
      return;
    }
    this.appSettingsService.holisticHarmonizerSettings.set({
      ...this.appSettingsService.holisticHarmonizerSettings(),
      llmModelId: this.llmModelId(),
    });
  }

  async onCheckAllModels(): Promise<void> {
    if (this.isChecking()) {
      return;
    }
    this.isChecking.set(true);
    this.checkError.set(null);
    this.checkResults.set([]);
    try {
      const response = await this.dataHolisticHarmonizerService.checkAllModels();
      this.checkResults.set(response.models);
      await this.loadLlmModels();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.checkError.set(message);
    } finally {
      this.isChecking.set(false);
    }
  }

  selectModel(modelId: string): void {
    this.llmModelId.set(modelId);
    this.onSettingChanged();
  }
}
