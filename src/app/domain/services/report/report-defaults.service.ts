// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { SettingsListReaderService } from 'src/app/domain/services/settings/settings-list-reader.service';
import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';

@Injectable({ providedIn: 'root' })
export class ReportDefaultsService {
  private settingsApi = inject(DataSettingsVariousService);
  private settingsListReader = inject(SettingsListReaderService);
  private reportApi = inject(DataReportApiService);

  defaults = signal<Record<string, string>>({});
  private settingId: string | undefined;
  private loaded = false;

  async load(): Promise<void> {
    try {
      const allSettings = await firstValueFrom(this.settingsListReader.readSettingList());
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

  loadAvailableTemplates(): Promise<ReportTemplate[]> {
    return this.reportApi.getAllTemplates();
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
