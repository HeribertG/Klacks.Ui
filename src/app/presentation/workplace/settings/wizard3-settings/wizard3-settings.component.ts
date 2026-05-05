// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings page for the LLM-driven schedule harmonizer (Wizard 3).
 * Lets the operator pick which LLM model the wizard uses globally.
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';

@Component({
  selector: 'app-wizard3-settings',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './wizard3-settings.component.html',
  styleUrls: ['./wizard3-settings.component.scss'],
})
export class Wizard3SettingsComponent implements OnInit {
  private readonly appSettingsService = inject(AppSettingsManagementService);
  private readonly dataAssistantService = inject(DataAssistantService);

  llmModelId = '';
  readonly llmModels = signal<{ value: string; label: string }[]>([]);
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
}
