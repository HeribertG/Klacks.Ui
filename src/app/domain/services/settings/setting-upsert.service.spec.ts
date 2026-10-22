// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { SettingUpsertService } from './setting-upsert.service';

describe('SettingUpsertService', () => {
  let service: SettingUpsertService;
  let api: { updateSetting: ReturnType<typeof vi.fn>; addSetting: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { updateSetting: vi.fn(), addSetting: vi.fn() };
    TestBed.configureTestingModule({
      providers: [SettingUpsertService, { provide: DataSettingsVariousService, useValue: api }],
    });
    service = TestBed.inject(SettingUpsertService);
  });

  it('updates a setting that already has an id', async () => {
    const setting: ISetting = { id: 's-1', type: 'FONT', value: 'Arial' };
    api.updateSetting.mockReturnValue(of(setting));

    await firstValueFrom(service.upsert(setting));

    expect(api.updateSetting).toHaveBeenCalledWith(setting);
    expect(api.addSetting).not.toHaveBeenCalled();
  });

  it('adds a setting without id as a new setting and writes the assigned id back', async () => {
    const setting: ISetting = { id: undefined, type: 'FONT', value: 'Arial' };
    api.addSetting.mockReturnValue(of({ id: 'new-id', type: 'FONT', value: 'Arial' }));

    const saved = service.upsert(setting);

    expect(api.addSetting).toHaveBeenCalledWith(expect.objectContaining({ type: 'FONT', value: 'Arial' }));
    expect('id' in setting).toBe(false);

    await firstValueFrom(saved);

    expect(setting.id).toBe('new-id');
    expect(api.updateSetting).not.toHaveBeenCalled();
  });
});
