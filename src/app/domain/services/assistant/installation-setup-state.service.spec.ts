// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { IScheduleSetupState } from 'src/app/domain/interfaces/schedule-setup-state.interface';
import { DataScheduleSetupStateService } from 'src/app/infrastructure/api/assistant/data-schedule-setup-state.service';
import { InstallationSetupStateService } from './installation-setup-state.service';

describe('InstallationSetupStateService', () => {
  const EMPTY: IScheduleSetupState = {
    hasOrders: false,
    hasShifts: false,
    hasWork: false,
    hasCustomers: false,
    hasGroups: false,
  };
  let service: InstallationSetupStateService;
  let getState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getState = vi.fn();
    TestBed.configureTestingModule({
      providers: [InstallationSetupStateService, { provide: DataScheduleSetupStateService, useValue: { getState } }],
    });
    service = TestBed.inject(InstallationSetupStateService);
  });

  it('is empty while there is no order, shift or work, regardless of customers and groups', async () => {
    getState.mockReturnValue(of({ ...EMPTY, hasCustomers: true, hasGroups: true }));

    await expect(firstValueFrom(service.isInstallationEmpty())).resolves.toBe(true);
  });

  it('is not empty as soon as any link of the order chain exists', async () => {
    for (const filled of [{ hasOrders: true }, { hasShifts: true }, { hasWork: true }]) {
      getState.mockReturnValue(of({ ...EMPTY, ...filled }));

      await expect(firstValueFrom(service.isInstallationEmpty())).resolves.toBe(false);
    }
  });
});
