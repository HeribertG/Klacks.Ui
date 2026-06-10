// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for the per-user Klacksy autonomy level (0 propose-only to 3 fully autonomous).
 * Loads the current level on init and persists a selected level immediately via PUT.
 * @param currentLevel - Signal holding the persisted autonomy level
 * @param isLoading - Signal set while the initial GET is running
 * @param isSaving - Signal set while a PUT is in flight
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

interface AutonomyLevelOption {
  value: number;
  labelKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-klacksy-autonomy-settings',
  templateUrl: './klacksy-autonomy-settings.component.html',
  styleUrls: ['./klacksy-autonomy-settings.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KlacksyAutonomySettingsComponent implements OnInit {
  private dataAssistantService = inject(DataAssistantService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly currentLevel = signal<number>(2);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);

  readonly levels: AutonomyLevelOption[] = [
    { value: 0, labelKey: 'setting.autonomy.level-0', descriptionKey: 'setting.autonomy.desc-0' },
    { value: 1, labelKey: 'setting.autonomy.level-1', descriptionKey: 'setting.autonomy.desc-1' },
    { value: 2, labelKey: 'setting.autonomy.level-2', descriptionKey: 'setting.autonomy.desc-2' },
    { value: 3, labelKey: 'setting.autonomy.level-3', descriptionKey: 'setting.autonomy.desc-3' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const dto = await firstValueFrom(this.dataAssistantService.getAutonomyLevel());
      this.currentLevel.set(dto.level);
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('setting.autonomy.load-failed'),
        this.translateService.instant('setting.autonomy.headline')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSelectLevel(level: number): Promise<void> {
    if (level === this.currentLevel() || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    try {
      const dto = await firstValueFrom(this.dataAssistantService.setAutonomyLevel({ level }));
      this.currentLevel.set(dto.level);
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('setting.autonomy.save-failed'),
        this.translateService.instant('setting.autonomy.headline')
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
