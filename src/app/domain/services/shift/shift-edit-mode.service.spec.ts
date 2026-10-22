// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ShiftEditModeService } from './shift-edit-mode.service';

describe('ShiftEditModeService', () => {
  let service: ShiftEditModeService;
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage = { get: vi.fn(), set: vi.fn() };
    TestBed.configureTestingModule({
      providers: [ShiftEditModeService, { provide: LocalStorageService, useValue: storage }],
    });
    service = TestBed.inject(ShiftEditModeService);
  });

  it('is complex only when the stored text is complex', () => {
    storage.get.mockReturnValue('complex');
    expect(service.isComplex()).toBe(true);

    storage.get.mockReturnValue('simple');
    expect(service.isComplex()).toBe(false);

    storage.get.mockReturnValue('');
    expect(service.isComplex()).toBe(false);

    storage.get.mockReturnValue(null);
    expect(service.isComplex()).toBe(false);
    expect(storage.get).toHaveBeenCalledWith(StorageKeys.SHIFT_EDIT_MODE);
  });

  it('stores the choice as complex or simple under the legacy mode key', () => {
    service.setComplex(true);
    service.setComplex(false);

    expect(StorageKeys.SHIFT_EDIT_MODE).toBe('mode');
    expect(storage.set).toHaveBeenNthCalledWith(1, StorageKeys.SHIFT_EDIT_MODE, 'complex');
    expect(storage.set).toHaveBeenNthCalledWith(2, StorageKeys.SHIFT_EDIT_MODE, 'simple');
  });
});
