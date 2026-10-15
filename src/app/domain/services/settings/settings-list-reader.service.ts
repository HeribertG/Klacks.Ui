// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the installation settings list for the services that tune the UI with them (grid colours, schedule and report
 * defaults, app settings). The endpoint is administrator-only by design (settings carry decrypted secrets for the
 * settings page), so every other user gets an empty list and the callers keep their built-in defaults instead of
 * provoking a 403 and its error toast on every login.
 */

import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ISetting } from 'src/app/domain/models/settings/settings-various-class';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';

@Injectable({ providedIn: 'root' })
export class SettingsListReaderService {
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private authorizationService = inject(AuthorizationService);

  readSettingList(): Observable<ISetting[]> {
    return this.authorizationService.isAdmin ? this.dataSettingsVariousService.readSettingList() : of([]);
  }
}
