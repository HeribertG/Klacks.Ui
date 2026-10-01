// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for the success toast shown after "Optimize route".
 * @param optimizeRoute - Runs the optimization and reports distance and driving time in a toast
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { RouteOptimizationService } from 'src/app/domain/services/route-optimization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const DETAILS_KEY = 'shift.container-template.toast.route-optimized-details';
const OPTIMIZING_KEY = 'shift.container-template.toast.optimizing-route';

function leg(shiftId: string, distanceToNextKm: number, travelTimeToNext: string) {
  return {
    order: 0,
    shiftId,
    name: shiftId,
    address: shiftId,
    latitude: 0,
    longitude: 0,
    distanceToNextKm,
    travelTimeToNext,
  };
}

describe('ContainerTemplateRouteService optimizeRoute toast', () => {
  let service: ContainerTemplateRouteService;
  let showSuccess: ReturnType<typeof vi.fn>;
  let showInfo: ReturnType<typeof vi.fn>;
  let showError: ReturnType<typeof vi.fn>;
  let dismissByName: ReturnType<typeof vi.fn>;
  let optimizeResult: Observable<unknown>;
  let instant: ReturnType<typeof vi.fn>;

  const items = [
    { shiftId: 's1' } as IContainerTemplateItem,
    { shiftId: 's2' } as IContainerTemplateItem,
  ];

  const liveResult = {
    optimizedRoute: [
      leg(EMPTY_GUID, 2.47, '00:02:57.9733995'),
      leg('s1', 3.06, '00:03:40.4197401'),
      leg('s2', 4.91, '00:05:53.4951120'),
      leg(EMPTY_GUID, 0, '00:00:00'),
    ],
    totalDistanceKm: 14.784530104582718,
    estimatedTravelTime: '02:47:44.4861675',
    travelTimeFromStartBase: '00:00:00',
    distanceFromStartBaseKm: 0,
    distanceToEndBaseKm: 1.88,
    travelTimeToEndBase: '00:02:15.1831464',
  };

  beforeEach(() => {
    showSuccess = vi.fn();
    showInfo = vi.fn();
    showError = vi.fn();
    dismissByName = vi.fn();
    optimizeResult = of(liveResult);
    instant = vi.fn((key: string) => key);

    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateRouteService,
        { provide: RouteOptimizationService, useValue: { optimizeRoute: () => optimizeResult } },
        { provide: DataManagementContainerService, useValue: { updateRouteInfo: vi.fn() } },
        {
          provide: ContainerTemplateShiftService,
          useValue: { selectedContainerTemplateItemsSignal: () => items },
        },
        { provide: ContainerTemplateItemManipulationService, useValue: {} },
        {
          provide: ToastShowService,
          useValue: { showInfo, showSuccess, showError, dismissByName },
        },
        { provide: TranslateService, useValue: { instant } },
        { provide: SpinnerService, useValue: {} },
        { provide: WorkplaceStateService, useValue: { areObjectsDirty: vi.fn() } },
        { provide: AddressProviderService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: TableSortingService, useValue: {} },
        { provide: DataShiftService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerTemplateRouteService);
  });

  it('reports pure driving time as HH:mm instead of the raw TimeSpan string', () => {
    service.optimizeRoute(null, false, { hours: '08', minutes: '00' } as never, new Subject<void>());

    const detailsCall = instant.mock.calls.find(([key]) => key === DETAILS_KEY);
    expect(detailsCall).toBeDefined();
    expect(detailsCall?.[1]).toEqual({ distance: '14.78', time: '00:13' });
    expect(showSuccess).toHaveBeenCalledTimes(1);
  });

  const runOptimize = () =>
    service.optimizeRoute(null, false, { hours: '08', minutes: '00' } as never, new Subject<void>());

  it('names the calculating info toast so it can be closed afterwards', () => {
    runOptimize();

    const infoCall = showInfo.mock.calls.find(([message]) => message === OPTIMIZING_KEY);
    expect(infoCall?.[1]).toBeTruthy();
  });

  it('closes the calculating info toast when the optimization succeeds', () => {
    runOptimize();

    const infoName = showInfo.mock.calls.find(([message]) => message === OPTIMIZING_KEY)?.[1];
    expect(dismissByName).toHaveBeenCalledWith(infoName);
  });

  it('closes the calculating info toast when the optimization fails', () => {
    optimizeResult = throwError(() => new Error('boom'));

    runOptimize();

    const infoName = showInfo.mock.calls.find(([message]) => message === OPTIMIZING_KEY)?.[1];
    expect(dismissByName).toHaveBeenCalledWith(infoName);
    expect(showError).toHaveBeenCalledTimes(1);
  });
});
