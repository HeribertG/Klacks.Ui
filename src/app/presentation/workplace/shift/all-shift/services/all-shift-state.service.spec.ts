// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { FILTER_STORAGE_TOKEN } from 'src/app/domain/interfaces/filter-storage.interface';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-filter-class';
import { IShiftFilter } from 'src/app/domain/models/shift/shift-filter.interface';
import { SearchStateService } from 'src/app/domain/services/search-state.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { AllShiftStateService } from './all-shift-state.service';

describe('AllShiftStateService - transient view override', () => {
  let service: AllShiftStateService;
  let filter: ShiftFilter;
  let saveFilter: ReturnType<typeof vi.fn>;

  const plannableWindow: Partial<IShiftFilter> = {
    filterType: ShiftFilterType.Shift,
    activeDateRange: true,
    formerDateRange: true,
    futureDateRange: true,
    validFrom: new Date(2026, 10, 1),
    validUntil: new Date(2026, 10, 30),
  };

  const saved = () => saveFilter.mock.calls.at(-1)?.[1] as IShiftFilter;

  beforeEach(() => {
    filter = new ShiftFilter();
    saveFilter = vi.fn(() => Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        AllShiftStateService,
        { provide: DataManagementShiftService, useValue: { currentFilter: filter } },
        { provide: WorkplaceStateService, useValue: {} },
        { provide: SearchService, useValue: {} },
        { provide: LocalStorageService, useValue: { get: () => null } },
        { provide: SearchStateService, useValue: {} },
        { provide: FILTER_STORAGE_TOKEN, useValue: { saveFilter } },
        { provide: GroupSelectionService, useValue: {} },
      ],
    });
    service = TestBed.inject(AllShiftStateService);
  });

  it('shows the override in the live filter but stores the filter the user had before', async () => {
    // Arrange
    filter.searchString = 'kept';

    // Act
    service.applyTransientOverride(plannableWindow);
    await service.saveCurrentFilter();

    // Assert
    expect(filter.filterType).toBe(ShiftFilterType.Shift);
    expect(filter.validFrom).toEqual(new Date(2026, 10, 1));
    expect(filter.futureDateRange).toBe(true);
    expect(saved().filterType).toBe(ShiftFilterType.Original);
    expect(saved().validFrom).toBeUndefined();
    expect(saved().validUntil).toBeUndefined();
    expect(saved().futureDateRange).toBe(false);
    expect(saved().searchString).toBe('kept');
  });

  it('keeps the whole override once the user changed one overridden field', async () => {
    // Arrange
    service.applyTransientOverride(plannableWindow);
    filter.validUntil = new Date(2026, 11, 31);

    // Act
    await service.saveCurrentFilter();

    // Assert
    expect(saved().filterType).toBe(ShiftFilterType.Shift);
    expect(saved().futureDateRange).toBe(true);
    expect(saved().validFrom).toEqual(new Date(2026, 10, 1));
    expect(saved().validUntil).toEqual(new Date(2026, 11, 31));
  });

  it('stores every overridden field when the user changed only validFrom', async () => {
    // Arrange
    service.applyTransientOverride(plannableWindow);
    filter.validFrom = new Date(2026, 9, 15);

    // Act
    await service.saveCurrentFilter();

    // Assert
    expect(saved().filterType).toBe(ShiftFilterType.Shift);
    expect(saved().activeDateRange).toBe(true);
    expect(saved().formerDateRange).toBe(true);
    expect(saved().futureDateRange).toBe(true);
    expect(saved().validFrom).toEqual(new Date(2026, 9, 15));
    expect(saved().validUntil).toEqual(new Date(2026, 10, 30));
  });

  it('stays taken over when the user later sets the changed field back to the requested value', async () => {
    // Arrange
    service.applyTransientOverride(plannableWindow);
    filter.validFrom = new Date(2026, 9, 15);
    await service.saveCurrentFilter();
    filter.validFrom = new Date(2026, 10, 1);

    // Act
    await service.saveCurrentFilter();

    // Assert
    expect(saved().filterType).toBe(ShiftFilterType.Shift);
    expect(saved().validFrom).toEqual(new Date(2026, 10, 1));
  });

  it('takes the user values as the new baseline when a request arrives after a takeover', async () => {
    // Arrange
    service.applyTransientOverride(plannableWindow);
    filter.validFrom = new Date(2026, 9, 15);
    service.applyTransientOverride({ filterType: ShiftFilterType.Original, isSealedOrder: false });

    // Act
    await service.saveCurrentFilter();

    // Assert
    expect(filter.filterType).toBe(ShiftFilterType.Original);
    expect(saved().filterType).toBe(ShiftFilterType.Shift);
    expect(saved().validFrom).toEqual(new Date(2026, 9, 15));
  });

  it('keeps the original baseline when a second request arrives while the first one is still untouched', async () => {
    // Arrange
    service.applyTransientOverride(plannableWindow);
    service.applyTransientOverride({ filterType: ShiftFilterType.Original, isSealedOrder: false });

    // Act
    await service.saveCurrentFilter();

    // Assert
    expect(filter.filterType).toBe(ShiftFilterType.Original);
    expect(saved().filterType).toBe(ShiftFilterType.Original);
    expect(saved().validFrom).toBeUndefined();
  });

  it('stores the override as the real filter once it was committed', async () => {
    // Arrange
    service.applyTransientOverride(plannableWindow);

    // Act
    service.commitTransientOverride();
    await service.saveCurrentFilter();

    // Assert
    expect(saved().filterType).toBe(ShiftFilterType.Shift);
    expect(saved().validFrom).toEqual(new Date(2026, 10, 1));
  });

  it('stores the live filter untouched when no override was applied', async () => {
    // Arrange / Act
    await service.saveCurrentFilter();

    // Assert
    expect(saveFilter.mock.calls[0][1]).toBe(filter);
  });
});
