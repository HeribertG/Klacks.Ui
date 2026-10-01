// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for the warning toast shown when the backend could not reach the routing service and the
 * travel times of "Optimize route" or "Autofill" are only Haversine estimates.
 * @param optimizeRoute - Optimizes the selected shifts and warns when the result is estimated
 * @param autofill - Fills the container and warns when the result is estimated
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
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';

const ESTIMATED_KEY = 'shift.container-template.toast.travel-times-estimated';
const START_TIME = { hours: '08', minutes: '00' } as never;
const BASE_ADDRESS = 'Neuwiesenstrasse 20, 8401 Winterthur';

function routeResult(isEstimated: boolean | undefined) {
  return {
    optimizedRoute: [],
    totalDistanceKm: 11.2,
    estimatedTravelTime: '00:30:00',
    travelTimeFromStartBase: '00:05:00',
    distanceFromStartBaseKm: 1.3,
    distanceToEndBaseKm: 3.9,
    travelTimeToEndBase: '00:07:00',
    totalBriefingDebriefingTime: '00:00:00',
    selectedShiftIds: ['s1'],
    selectedShiftCount: 1,
    totalAvailableShifts: 3,
    totalWorkTime: '00:20:00',
    remainingTime: '01:00:00',
    isEstimated,
  };
}

describe('ContainerTemplateRouteService estimated travel times warning', () => {
  let service: ContainerTemplateRouteService;
  let showInfo: ReturnType<typeof vi.fn>;
  let dismissByName: ReturnType<typeof vi.fn>;
  let result: ReturnType<typeof routeResult>;

  const items = [
    { shiftId: 's1' } as IContainerTemplateItem,
    { shiftId: 's2' } as IContainerTemplateItem,
  ];

  beforeEach(() => {
    showInfo = vi.fn();
    dismissByName = vi.fn();
    result = routeResult(true);

    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateRouteService,
        {
          provide: RouteOptimizationService,
          useValue: { optimizeRoute: () => of(result), autofill: () => of(result) },
        },
        {
          provide: DataManagementContainerService,
          useValue: {
            updateRouteInfo: vi.fn(),
            getWeekdayNumber: () => 3,
            updateTaskOrderInTemplates: vi.fn(),
          },
        },
        {
          provide: ContainerTemplateShiftService,
          useValue: {
            selectedContainerTemplateItemsSignal: () => items,
            setSelectedContainerTemplateItems: vi.fn(),
          },
        },
        {
          provide: ContainerTemplateItemManipulationService,
          useValue: { applyOptimizedRoute: () => [] },
        },
        {
          provide: ToastShowService,
          useValue: { showInfo, showSuccess: vi.fn(), showError: vi.fn(), dismissByName },
        },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: SpinnerService, useValue: {} },
        { provide: WorkplaceStateService, useValue: { areObjectsDirty: vi.fn() } },
        { provide: AddressProviderService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: TableSortingService, useValue: { restoreSortState: vi.fn() } },
        { provide: DataShiftService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerTemplateRouteService);
  });

  const warningCall = () => showInfo.mock.calls.find(([message]) => message === ESTIMATED_KEY);

  const runOptimize = () => service.optimizeRoute(null, false, START_TIME, new Subject<void>());

  const runAutofill = () => {
    service.selectedStartBase = BASE_ADDRESS;
    service.selectedEndBase = BASE_ADDRESS;
    service.autofill(
      {
        containerShift: { id: 'container-1' } as IShift,
        selectedWeekday: 'wednesday',
        isHoliday: false,
        timeFrom: START_TIME,
        timeTo: { hours: '10', minutes: '30' } as never,
        additionalAvailableWorkIds: [],
        timeRangeToleranceValue: 100,
        destroy$: new Subject<void>(),
      },
      [{ id: 's1' } as IShift],
    );
  };

  it('warns with the warning icon when the optimized route is estimated', () => {
    runOptimize();

    const call = warningCall();
    expect(call).toBeDefined();
    expect(call?.[1]).toBeTruthy();
    expect(call?.[3]).toBe(TOAST_ICONS.WARNING);
  });

  it('does not close the warning together with the calculating toast', () => {
    runOptimize();

    expect(dismissByName).not.toHaveBeenCalledWith(warningCall()?.[1]);
  });

  it('does not warn when the optimized route comes from the routing service', () => {
    result = routeResult(false);

    runOptimize();

    expect(warningCall()).toBeUndefined();
  });

  it('does not warn when an older backend sends no flag', () => {
    result = routeResult(undefined);

    runOptimize();

    expect(warningCall()).toBeUndefined();
  });

  it('warns when the autofill result is estimated', () => {
    runAutofill();

    expect(warningCall()?.[3]).toBe(TOAST_ICONS.WARNING);
  });

  it('does not warn when the autofill result comes from the routing service', () => {
    result = routeResult(false);

    runAutofill();

    expect(warningCall()).toBeUndefined();
  });
});
