// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for the LLM-driven schedule harmonizer (Wizard 3).
 * Lets the operator pick which LLM model the wizard uses globally and run a one-click
 * compatibility check across all enabled models (latency + JSON-format compliance).
 */
import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataWizard3Service } from 'src/app/infrastructure/api/wizard3/data-wizard3.service';
import { Wizard3ModelCheckDto } from 'src/app/domain/models/wizard3/wizard3-run.model';

@Component({
  selector: 'app-wizard-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './wizard-settings.component.html',
  styleUrls: ['./wizard-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardSettingsComponent implements OnInit {
  private readonly appSettingsService = inject(AppSettingsManagementService);
  private readonly dataAssistantService = inject(DataAssistantService);
  private readonly dataWizard3Service = inject(DataWizard3Service);

  llmModelId = '';
  readonly llmModels = signal<{ value: string; label: string }[]>([]);
  readonly checkResults = signal<Wizard3ModelCheckDto[]>([]);
  readonly isChecking = signal<boolean>(false);
  readonly checkError = signal<string | null>(null);
  private isInitialized = false;

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    this.llmModelId = this.appSettingsService.wizard3Settings().llmModelId;
    this.isInitialized = true;

    try {
      const models = await firstValueFrom(this.dataAssistantService.getModels());
      this.llmModels.set(
        models
          .filter((m) => m.isEnabled)
          .map((m) => ({ value: m.modelId, label: m.displayName ?? m.modelId })),
      );
    } catch {
      this.llmModels.set([]);
    }
  }

  onSettingChanged(): void {
    if (!this.isInitialized) {
      return;
    }
    this.appSettingsService.wizard3Settings.set({
      ...this.appSettingsService.wizard3Settings(),
      llmModelId: this.llmModelId,
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
      const response = await this.dataWizard3Service.checkAllModels();
      this.checkResults.set(response.models);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.checkError.set(message);
    } finally {
      this.isChecking.set(false);
    }
  }

  selectModel(modelId: string): void {
    this.llmModelId = modelId;
    this.onSettingChanged();
  }
}
