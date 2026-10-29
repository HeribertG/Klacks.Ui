// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests that loading a weekday template keeps a stored start/end base that is not among the known addresses (e.g. the
 * city a Klacksy bundle stored), so the route tools stay visible and the base is offered as an extra option, while a
 * stored name still resolves to the address of its entry.
 */
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { RouteOptimizationService } from 'src/app/domain/services/route-optimization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { IAddressEntry } from 'src/app/domain/services/address-entry.interface';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { createGeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';

describe('ContainerTemplateRouteService stored start/end base', () => {
  const branch: IAddressEntry = {
    name: 'Filiale Seen',
    address: 'Seenerstrasse 5, 8405 Winterthur',
    isAppAddress: false,
  };

  const setup = (startBase: string, endBase: string, addresses: IAddressEntry[]): ContainerTemplateRouteService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateRouteService,
        { provide: RouteOptimizationService, useValue: {} },
        {
          provide: DataManagementContainerService,
          useValue: {
            getWeekdayNumber: () => 4,
            getTemplateForWeekday: () => ({
              startBase,
              endBase,
              transportMode: ContainerTransportModeEnum.byCar,
              routeInfo: null,
            }),
          },
        },
        { provide: ContainerTemplateShiftService, useValue: {} },
        { provide: ContainerTemplateItemManipulationService, useValue: {} },
        { provide: ToastShowService, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: SpinnerService, useValue: {} },
        { provide: WorkplaceStateService, useValue: {} },
        { provide: AddressProviderService, useValue: { allAddresses: () => addresses } },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: TableSortingService, useValue: {} },
        { provide: DataShiftService, useValue: {} },
        { provide: GeoServicesConfigService, useValue: createGeoServicesConfigMock() },
      ],
    });
    const service = TestBed.inject(ContainerTemplateRouteService);
    service.loadStartEndBaseForCurrentTemplate('thursday', false);
    return service;
  };

  it('keeps a stored city that is not among the known addresses and offers it as an option', () => {
    const service = setup('Winterthur', 'Winterthur', [branch]);

    expect(service.selectedStartBase).toBe('Winterthur');
    expect(service.selectedEndBase).toBe('Winterthur');
    expect(service.unlistedBases).toEqual(['Winterthur']);
  });

  it('keeps a stored city when no addresses are known at all', () => {
    const service = setup('Winterthur', 'Winterthur', []);

    expect(service.selectedStartBase).toBe('Winterthur');
    expect(service.unlistedBases).toEqual(['Winterthur']);
  });

  it('resolves a stored branch name to its address without an extra option', () => {
    const service = setup('Filiale Seen', branch.address, [branch]);

    expect(service.selectedStartBase).toBe(branch.address);
    expect(service.selectedEndBase).toBe(branch.address);
    expect(service.unlistedBases).toEqual([]);
  });

  it('leaves an empty stored base empty', () => {
    const service = setup('', '', [branch]);

    expect(service.selectedStartBase).toBe('');
    expect(service.unlistedBases).toEqual([]);
  });
});
