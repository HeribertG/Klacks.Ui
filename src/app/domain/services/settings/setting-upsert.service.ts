// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Saves one installation setting: a setting with an id is updated, one without is added as a new setting and gets the
 * id the server assigned written back, so the next save updates it.
 * @param setting - The setting to save; for a new setting its id is cleared before the request and set on success
 */

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Setting } from 'src/app/domain/models/settings/settings-various-class';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';

@Injectable({ providedIn: 'root' })
export class SettingUpsertService {
  private dataSettingsVariousService = inject(DataSettingsVariousService);

  upsert(setting: ISetting): Observable<void> {
    if (setting.id) {
      return this.dataSettingsVariousService.updateSetting(setting).pipe(map(() => undefined));
    }

    const newSetting = new Setting();
    delete setting.id;
    newSetting.value = setting.value;
    newSetting.type = setting.type;
    return this.dataSettingsVariousService.addSetting(newSetting).pipe(
      tap((savedSetting) => {
        setting.id = savedSetting.id;
      }),
      map(() => undefined)
    );
  }
}
