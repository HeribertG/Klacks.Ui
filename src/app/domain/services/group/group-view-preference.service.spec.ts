// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { GroupViewPreferenceService } from './group-view-preference.service';

describe('GroupViewPreferenceService', () => {
  let service: GroupViewPreferenceService;
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage = { get: vi.fn(), set: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: LocalStorageService, useValue: storage }],
    });
    service = TestBed.inject(GroupViewPreferenceService);
  });

  it('keeps the legacy storage key', () => {
    expect(StorageKeys.GROUP_VIEW_MODE).toBe('group-view-mode');
  });

  it('shows the grid when nothing is stored', () => {
    storage.get.mockReturnValue(null);

    expect(service.isGridView()).toBe(true);
    expect(storage.get).toHaveBeenCalledWith(StorageKeys.GROUP_VIEW_MODE);
  });

  it('shows the grid only for the stored text true', () => {
    storage.get.mockReturnValue('true');
    expect(service.isGridView()).toBe(true);

    storage.get.mockReturnValue('false');
    expect(service.isGridView()).toBe(false);

    storage.get.mockReturnValue('');
    expect(service.isGridView()).toBe(false);
  });

  it('stores the choice as text', () => {
    service.setGridView(true);
    service.setGridView(false);

    expect(storage.set).toHaveBeenNthCalledWith(1, StorageKeys.GROUP_VIEW_MODE, 'true');
    expect(storage.set).toHaveBeenNthCalledWith(2, StorageKeys.GROUP_VIEW_MODE, 'false');
  });
});
