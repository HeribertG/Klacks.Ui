// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A task the route does not name stays in the container: the server leaves out a shift the caller may not read and a shift
 * without coordinates, and a later save writes the full list, so dropping the item here would delete the task.
 */

import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { IRouteOptimizationResult } from 'src/app/domain/services/route-optimization-result.interface';
import { RouteOptimizationService } from 'src/app/domain/services/route-optimization.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { createGeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';
import { ContainerTemplateRouteService } from './container-template-route.service';

const WEEKDAY = 'thursday';
const WEEKDAY_NUMBER = 4;

const ITEMS = ['visible-a', 'hidden', 'visible-b'];

const item = (shiftId: string): IContainerTemplateItem =>
  ({ shiftId, shift: { workTime: 1 }, briefingTime: '00:00', debriefingTime: '00:00' }) as unknown as IContainerTemplateItem;

describe('ContainerTemplateRouteService with a task the route does not name', () => {
  it('keeps the task behind the routed ones', () => {
    const setSelected = vi.fn();
    const route = {
      optimizedRoute: [
        { shiftId: 'visible-b', travelTimeToNext: '00:05:00' },
        { shiftId: 'visible-a', travelTimeToNext: '00:00:00' },
      ],
      travelTimeFromStartBase: '00:00:00',
      travelTimeToEndBase: '00:00:00',
      distanceToEndBaseKm: 0,
      totalDistanceKm: 1,
    } as unknown as IRouteOptimizationResult;
    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateRouteService,
        ContainerTemplateItemManipulationService,
        { provide: RouteOptimizationService, useValue: { optimizeRoute: () => of(route) } },
        {
          provide: DataManagementContainerService,
          useValue: { getWeekdayNumber: () => WEEKDAY_NUMBER, updateTaskOrderInTemplates: vi.fn(), updateRouteInfo: vi.fn() },
        },
        {
          provide: ContainerTemplateShiftService,
          useValue: {
            selectedContainerTemplateItemsSignal: () => ITEMS.map(item),
            setSelectedContainerTemplateItems: setSelected,
          },
        },
        { provide: ToastShowService, useValue: { showInfo: vi.fn(), showSuccess: vi.fn(), dismissByName: vi.fn() } },
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
    const service = TestBed.inject(ContainerTemplateRouteService);

    service.optimizeRoute(WEEKDAY, false, new OwnTime('08', '00'), new Subject<void>());

    const written = setSelected.mock.calls[0][0] as IContainerTemplateItem[];
    expect(written.map((entry) => entry.shiftId)).toEqual(['visible-b', 'visible-a', 'hidden']);
  });
});
