// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the available order export formats and persists which optional ones are offered. The choice is stored as the
 * comma-separated ENABLED_EXPORT_FORMATS setting that lists the enabled, non-fixed formats. It also reads and stores
 * single whole-number settings such as the DATEV consultant and client numbers.
 * @param formats - Export formats with their enabled flag; fixed formats are always on and never stored
 * @param settingId - Id of the stored setting, or undefined while none exists yet
 * @param key - Settings key of a number setting (for example DATEV_CONSULTANT_NUMBER)
 * @param value - Number to store; null clears the stored value
 */

import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ExportFormatResource } from 'src/app/domain/models/settings/export-format-resource.interface';
import { parseDatevNumber } from 'src/app/domain/helpers/datev-number.helper';
import { NumberSettingState } from 'src/app/domain/models/settings/number-setting-state.interface';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';

const ENABLED_EXPORT_FORMATS_KEY = 'ENABLED_EXPORT_FORMATS';
const FORMAT_SEPARATOR = ',';

@Injectable({ providedIn: 'root' })
export class ExportFormatSettingsService {
  private formatsApi = inject(DataExportFormatsService);
  private settingsApi = inject(DataSettingsVariousService);

  getFormats(): Observable<ExportFormatResource[]> {
    return this.formatsApi.getFormats();
  }

  readEnabledFormatsSettingId(): Observable<string | undefined> {
    return this.settingsApi.readSetting(ENABLED_EXPORT_FORMATS_KEY).pipe(
      map((setting) => setting?.id),
      catchError(() => of(undefined)),
    );
  }

  saveEnabledFormats(formats: ExportFormatResource[], settingId: string | undefined): Observable<ISetting> {
    const value = formats
      .filter((f) => !f.fixed && f.enabled)
      .map((f) => f.key)
      .join(FORMAT_SEPARATOR);

    const setting: ISetting = { id: settingId, type: ENABLED_EXPORT_FORMATS_KEY, value };
    return settingId ? this.settingsApi.updateSetting(setting) : this.settingsApi.addSetting(setting);
  }

  readDatevNumberSetting(key: string): Observable<NumberSettingState> {
    return this.settingsApi.readSetting(key).pipe(
      map((setting) => ({ id: setting?.id, value: parseDatevNumber(setting?.value ?? '') })),
      catchError(() => of({ id: undefined, value: null })),
    );
  }

  saveNumberSetting(key: string, settingId: string | undefined, value: number | null): Observable<ISetting> {
    const setting: ISetting = { id: settingId, type: key, value: value === null ? '' : String(value) };
    if (!settingId && value === null) {
      return of(setting);
    }
    return settingId ? this.settingsApi.updateSetting(setting) : this.settingsApi.addSetting(setting);
  }
}
