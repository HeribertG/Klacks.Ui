// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { AUTOMATIC_ROW_SIZE } from 'src/app/domain/constants/row-size.constants';
import { RowSizePreferenceService } from './row-size-preference.service';

describe('RowSizePreferenceService', () => {
  const KEY = 'ROW_KEY';
  let service: RowSizePreferenceService;
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage = { get: vi.fn(), set: vi.fn() };
    TestBed.configureTestingModule({
      providers: [RowSizePreferenceService, { provide: LocalStorageService, useValue: storage }],
    });
    service = TestBed.inject(RowSizePreferenceService);
  });

  it('reads a stored numeric text as number, including the automatic marker', () => {
    storage.get.mockReturnValue('15');
    expect(service.read(KEY)).toBe(15);

    storage.get.mockReturnValue('-1');
    expect(service.read(KEY)).toBe(AUTOMATIC_ROW_SIZE);

    storage.get.mockReturnValue(' 7 ');
    expect(service.read(KEY)).toBe(7);
    expect(storage.get).toHaveBeenCalledWith(KEY);
  });

  it('returns null for a missing, empty or non-numeric value', () => {
    for (const stored of [null, '', 'invalid', '12abc', 'Infinity']) {
      storage.get.mockReturnValue(stored);
      expect(service.read(KEY)).toBeNull();
    }
  });

  it('stores the row size as text', () => {
    service.save(KEY, 10);
    service.save(KEY, AUTOMATIC_ROW_SIZE);

    expect(storage.set).toHaveBeenNthCalledWith(1, KEY, '10');
    expect(storage.set).toHaveBeenNthCalledWith(2, KEY, '-1');
  });
});
