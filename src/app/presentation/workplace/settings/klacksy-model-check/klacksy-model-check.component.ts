// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card that probes every configured LLM model for Klacksy readiness (reliable tool
 * calling and a large enough context window). Qualifying models are enabled, weak ones disabled,
 * and the best qualifying model becomes the default unless the user has already chosen a valid one.
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IKlacksyModelCheckDto } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

@Component({
  selector: 'app-klacksy-model-check',
  templateUrl: './klacksy-model-check.component.html',
  styleUrls: ['./klacksy-model-check.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KlacksyModelCheckComponent {
  private assistantService = inject(DataManagementAssistantService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly results = signal<IKlacksyModelCheckDto[]>([]);
  readonly defaultModelId = signal<string | null>(null);
  readonly isRunning = signal(false);
  readonly error = signal<string | null>(null);

  async onFindBestModels(): Promise<void> {
    if (this.isRunning()) {
      return;
    }
    this.isRunning.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.assistantService.optimizeForKlacksy(),
      );
      this.results.set(response.models);
      this.defaultModelId.set(response.defaultModelId);
      const qualified = response.models.filter((m) => m.qualifies).length;
      this.toastShowService.showSuccess(
        this.translateService.instant('setting.klacksy-models.result-summary', {
          qualified,
          total: response.models.length,
        }),
        this.translateService.instant('setting.klacksy-models.headline'),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.error.set(message);
    } finally {
      this.isRunning.set(false);
    }
  }

  async selectDefault(modelId: string): Promise<void> {
    try {
      await firstValueFrom(this.assistantService.setDefaultModel(modelId));
      this.defaultModelId.set(modelId);
      this.toastShowService.showSuccess(
        this.translateService.instant('setting.klacksy-models.default-set'),
        this.translateService.instant('setting.klacksy-models.headline'),
      );
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('setting.klacksy-models.error.set-default'),
        this.translateService.instant('setting.klacksy-models.headline'),
      );
    }
  }

  isDefault(modelId: string): boolean {
    return this.defaultModelId() === modelId;
  }

  isModelFree(model: IKlacksyModelCheckDto): boolean {
    return model.costPerInputToken === 0 && model.costPerOutputToken === 0;
  }
}
