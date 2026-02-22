// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { AppSetting, ISetting } from 'src/app/domain/models/settings/settings-various-class';

@Injectable({ providedIn: 'root' })
export class ReportDefaultsService {
  private settingsApi = inject(DataSettingsVariousService);

  defaults = signal<Record<string, string>>({});
  private settingId: string | undefined;
  private loaded = false;

  async load(): Promise<void> {
    try {
      const allSettings = await firstValueFrom(this.settingsApi.readSettingList());
      const setting = allSettings.find(s => s.type === AppSetting.REPORT_DEFAULT_TEMPLATES);
      if (setting) {
        this.settingId = setting.id;
        this.defaults.set(JSON.parse(setting.value || '{}'));
      } else {
        this.defaults.set({});
        this.settingId = undefined;
      }
    } catch {
      this.defaults.set({});
      this.settingId = undefined;
    }
    this.loaded = true;
  }

  async save(): Promise<void> {
    const value = JSON.stringify(this.defaults());
    if (this.settingId) {
      const setting: ISetting = { id: this.settingId, type: AppSetting.REPORT_DEFAULT_TEMPLATES, value };
      const result = await firstValueFrom(this.settingsApi.updateSetting(setting));
      this.settingId = result.id;
    } else {
      const setting: ISetting = { id: undefined, type: AppSetting.REPORT_DEFAULT_TEMPLATES, value };
      const result = await firstValueFrom(this.settingsApi.addSetting(setting));
      this.settingId = result.id;
    }
  }

  getDefaultTemplateId(sourceId: string): string | undefined {
    return this.defaults()[sourceId];
  }

  async setDefault(sourceId: string, templateId: string | null): Promise<void> {
    this.defaults.update(d => {
      const copy = { ...d };
      if (templateId) {
        copy[sourceId] = templateId;
      } else {
        delete copy[sourceId];
      }
      return copy;
    });
    await this.save();
  }

  hasDefault(sourceId: string): boolean {
    return !!this.defaults()[sourceId];
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
