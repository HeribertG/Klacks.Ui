// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests that the autofill request carries the container template slot (isHoliday and isWeekdayAndHoliday) to the backend,
 * so the autofill offers the same tasks as the available-task list of that slot.
 * @param autofill - Fills the container of the given slot
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { RouteOptimizationService } from 'src/app/domain/services/route-optimization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { createGeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';

const BASE_ADDRESS = 'Neuwiesenstrasse 20, 8401 Winterthur';
const WEDNESDAY = 3;
const IS_HOLIDAY_ARG = 2;
const IS_WEEKDAY_AND_HOLIDAY_ARG = 3;

describe('ContainerTemplateRouteService autofill holiday slot', () => {
  let service: ContainerTemplateRouteService;
  let autofill: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    autofill = vi.fn(() => of({ selectedShiftIds: [], selectedShiftCount: 0, optimizedRoute: [] }));

    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateRouteService,
        { provide: RouteOptimizationService, useValue: { autofill } },
        {
          provide: DataManagementContainerService,
          useValue: { getWeekdayNumber: () => WEDNESDAY, updateRouteInfo: vi.fn() },
        },
        {
          provide: ContainerTemplateShiftService,
          useValue: { selectedContainerTemplateItemsSignal: () => [], setSelectedContainerTemplateItems: vi.fn() },
        },
        { provide: ContainerTemplateItemManipulationService, useValue: { applyOptimizedRoute: () => [] } },
        {
          provide: ToastShowService,
          useValue: { showInfo: vi.fn(), showSuccess: vi.fn(), showError: vi.fn(), dismissByName: vi.fn() },
        },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: SpinnerService, useValue: {} },
        { provide: WorkplaceStateService, useValue: { areObjectsDirty: vi.fn() } },
        { provide: AddressProviderService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: TableSortingService, useValue: { restoreSortState: vi.fn() } },
        { provide: DataShiftService, useValue: {} },
        { provide: GeoServicesConfigService, useValue: createGeoServicesConfigMock() },
      ],
    });
    service = TestBed.inject(ContainerTemplateRouteService);
    service.selectedStartBase = BASE_ADDRESS;
    service.selectedEndBase = BASE_ADDRESS;
  });

  const slotSent = (isHoliday: boolean, isWeekdayAndHoliday: boolean): [unknown, unknown] => {
    service.autofill(
      {
        containerShift: { id: 'container-1' } as IShift,
        selectedWeekday: 'wednesday',
        isHoliday,
        isWeekdayAndHoliday,
        timeFrom: { hours: '08', minutes: '00' } as never,
        timeTo: { hours: '12', minutes: '00' } as never,
        additionalAvailableWorkIds: [],
        timeRangeToleranceValue: 100,
        destroy$: new Subject<void>(),
      },
      [],
    );
    const args = autofill.mock.calls.at(-1)!;
    return [args[IS_HOLIDAY_ARG], args[IS_WEEKDAY_AND_HOLIDAY_ARG]];
  };

  it('sends the normal slot', () => {
    expect(slotSent(false, false)).toEqual([false, false]);
  });

  it('sends the generic holiday slot', () => {
    expect(slotSent(true, false)).toEqual([true, false]);
  });

  it('sends the holiday slot of the weekday', () => {
    expect(slotSent(true, true)).toEqual([true, true]);
  });
});
