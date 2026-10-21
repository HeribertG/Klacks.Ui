// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SettingsExpertModeService } from './settings-expert-mode.service';

describe('SettingsExpertModeService', () => {
  let service: SettingsExpertModeService;
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage = { get: vi.fn(), set: vi.fn() };
    TestBed.configureTestingModule({
      providers: [SettingsExpertModeService, { provide: LocalStorageService, useValue: storage }],
    });
    service = TestBed.inject(SettingsExpertModeService);
  });

  it('is enabled only when the stored text is true', () => {
    storage.get.mockReturnValue('true');
    expect(service.isEnabled()).toBe(true);

    storage.get.mockReturnValue('false');
    expect(service.isEnabled()).toBe(false);

    storage.get.mockReturnValue(null);
    expect(service.isEnabled()).toBe(false);
    expect(storage.get).toHaveBeenCalledWith(StorageKeys.SETTINGS_EXPERT_MODE);
  });

  it('stores the choice as text', () => {
    service.setEnabled(true);
    service.setEnabled(false);

    expect(storage.set).toHaveBeenNthCalledWith(1, StorageKeys.SETTINGS_EXPERT_MODE, 'true');
    expect(storage.set).toHaveBeenNthCalledWith(2, StorageKeys.SETTINGS_EXPERT_MODE, 'false');
  });
});
