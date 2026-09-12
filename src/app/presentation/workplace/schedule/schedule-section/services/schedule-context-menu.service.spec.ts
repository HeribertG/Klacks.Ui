// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ScheduleContextMenuService, ContextMenuContext } from './schedule-context-menu.service';
import { TranslateService } from '@ngx-translate/core';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { WorkLockLevelService } from 'src/app/domain/services/schedule/work-lock-level.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { ScheduleDataService } from './schedule-data.service';

describe('ScheduleContextMenuService - role seniority gates unconfirm', () => {
  let service: ScheduleContextMenuService;
  let held: Set<string>;
  let canUnconfirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    held = new Set<string>();
    canUnconfirm = vi.fn().mockReturnValue(true);

    const hasPermission = (permission: string): boolean => held.has(permission);

    TestBed.configureTestingModule({
      providers: [
        ScheduleContextMenuService,
        { provide: TranslateService, useValue: { currentLang: 'en', instant: (key: string) => key } },
        { provide: BaseCellManipulationService, useValue: { hasClipboardData: vi.fn() } },
        { provide: DataManagementScheduleService, useValue: { shiftSchedules: [] } },
        { provide: AbsenceMenuService, useValue: { getAbsenceMenuItems: () => [] } },
        { provide: WorkLockLevelService, useValue: { canUnconfirm } },
        {
          provide: AuthorizationService,
          useValue: {
            hasPermission,
            hasAnyPermission: (...permissions: string[]) => permissions.some(hasPermission),
          },
        },
      ],
    });

    service = TestBed.inject(ScheduleContextMenuService);
  });

  const buildLockedWorkContext = (): ContextMenuContext => {
    const entry = new ScheduleCell();
    entry.entryType = WorkScheduleEntryType.Work;
    entry.lockLevel = 1;
    entry.isGroupRestricted = false;

    return {
      row: 0,
      column: 0,
      entry,
      dataService: {} as ScheduleDataService,
    };
  };

  it('reports neither admin nor supervisor for a planer, whose floor rights must not unseal a lock', () => {
    service.createContextMenu(buildLockedWorkContext());

    expect(canUnconfirm).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it('reports supervisor but not admin for the Authorised role', () => {
    held.add(ROLE_AUTHORISED);

    service.createContextMenu(buildLockedWorkContext());

    expect(canUnconfirm).toHaveBeenCalledWith(expect.anything(), false, true);
  });

  it('reports admin and supervisor for the Admin role', () => {
    held.add(ROLE_ADMIN);

    service.createContextMenu(buildLockedWorkContext());

    expect(canUnconfirm).toHaveBeenCalledWith(expect.anything(), true, true);
  });
});
