// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { SettingsListReaderService } from './settings-list-reader.service';

describe('SettingsListReaderService', () => {
  const settings = [{ id: '1', type: 'APP_NAME', value: 'Klacks' }];
  let dataService: { readSettingList: ReturnType<typeof vi.fn> };

  function create(isAdmin: boolean): SettingsListReaderService {
    dataService = { readSettingList: vi.fn(() => of(settings)) };
    TestBed.configureTestingModule({
      providers: [
        SettingsListReaderService,
        { provide: DataSettingsVariousService, useValue: dataService },
        { provide: AuthorizationService, useValue: { isAdmin } },
      ],
    });
    return TestBed.inject(SettingsListReaderService);
  }

  it('reads the settings list for an administrator', async () => {
    const reader = create(true);

    expect(await firstValueFrom(reader.readSettingList())).toEqual(settings);
    expect(dataService.readSettingList).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list without calling the admin-only endpoint for everybody else', async () => {
    const reader = create(false);

    expect(await firstValueFrom(reader.readSettingList())).toEqual([]);
    expect(dataService.readSettingList).not.toHaveBeenCalled();
  });
});
