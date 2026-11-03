// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ScheduleContextMenuService } from './schedule-context-menu.service';
import { ContextMenuContext } from './context-menu-context.interface';
import { TranslateService } from '@ngx-translate/core';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { WorkLockLevelService } from 'src/app/domain/services/schedule/work-lock-level.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { BreakPlaceholder } from 'src/app/domain/models/break/break-placeholder-class';
import { ScheduleDataService } from './schedule-data.service';
import { setCompanyTimeZone } from 'src/app/domain/helpers/calendar-date.helper';

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
      dataService: { isColumnOutsideScenario: () => false } as unknown as ScheduleDataService,
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

describe('ScheduleContextMenuService - cover absence entry', () => {
  let service: ScheduleContextMenuService;
  let held: Set<string>;
  let outsideScenario: boolean;
  let canUnconfirm: boolean;

  beforeEach(() => {
    held = new Set<string>();
    outsideScenario = false;
    canUnconfirm = false;
    const hasPermission = (permission: string): boolean => held.has(permission);

    TestBed.configureTestingModule({
      providers: [
        ScheduleContextMenuService,
        { provide: TranslateService, useValue: { currentLang: 'en', instant: (key: string) => key } },
        { provide: BaseCellManipulationService, useValue: { hasClipboardData: () => false } },
        {
          provide: DataManagementScheduleService,
          useValue: { shiftSchedules: [], clients: [{ id: 'origin-1', firstName: 'Elsa', name: 'Meier' }] },
        },
        { provide: AbsenceMenuService, useValue: { getAbsenceMenuItems: () => [] } },
        { provide: WorkLockLevelService, useValue: { canUnconfirm: () => canUnconfirm, canConfirm: () => false } },
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

  const buildContext = (entryType: WorkScheduleEntryType, lockLevel = 0): ContextMenuContext => {
    const entry = new ScheduleCell();
    entry.entryType = entryType;
    entry.lockLevel = lockLevel;
    entry.isGroupRestricted = false;
    entry.entryId = 'shift-1';
    entry.sourceId = 'work-1';

    return {
      row: 0,
      column: 0,
      entry,
      dataService: {
        isCellOutsideMembershipPeriod: () => false,
        isCellOutsideGroupPeriod: () => outsideScenario,
        isColumnSealed: () => false,
        isColumnOutsideScenario: () => outsideScenario,
        getAllEntriesForClientAndColumn: () => [],
      } as unknown as ScheduleDataService,
    };
  };

  const keysOf = (context: ContextMenuContext): string[] =>
    service.createContextMenu(context).list.map((item) => item.key);

  it('offers no write action on a work cell outside the active scenario', () => {
    held.add(PERMISSIONS.CanEditSchedule);
    outsideScenario = true;

    const keys = keysOf(buildContext(WorkScheduleEntryType.Work));

    for (const key of ['coverAbsence', 'replacement', 'del', 'cut', 'correction', 'expenses', 'confirm']) {
      expect(keys).not.toContain(key);
    }
  });

  it('offers no unconfirm on a confirmed entry outside the active scenario', () => {
    canUnconfirm = true;
    outsideScenario = true;

    expect(keysOf(buildContext(WorkScheduleEntryType.Work, 1))).not.toContain('unconfirm');
  });

  it('still offers unconfirm on a confirmed entry inside the scenario', () => {
    canUnconfirm = true;

    expect(keysOf(buildContext(WorkScheduleEntryType.Work, 1))).toContain('unconfirm');
  });

  it('offers no shift or absence on an empty cell outside the active scenario', () => {
    outsideScenario = true;

    const context = buildContext(WorkScheduleEntryType.Work);
    context.entry = null;

    expect(service.createContextMenu(context).list).toEqual([]);
  });

  it.each([
    [false, true],
    [true, false],
  ])('adopting a break placeholder with a day outside the scenario (%s) is offered: %s', (outside, offered) => {
    const placeholder = new BreakPlaceholder();
    placeholder.from = new Date(2026, 10, 30);
    placeholder.until = new Date(2026, 11, 2);
    const dataService = { isDateOutsideScenario: () => outside } as unknown as ScheduleDataService;

    const keys = service.createBreakPlaceholderContextMenu(placeholder, dataService).list.map((item) => item.key);

    expect(keys.includes('adoptAbsence')).toBe(offered);
    expect(keys).toContain('deleteBreakPlaceholder');
  });

  it('offers "cover absence" on an unlocked work cell to anyone who may edit the schedule (planner floor)', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    expect(keysOf(buildContext(WorkScheduleEntryType.Work))).toContain('coverAbsence');
  });

  it('hides "cover absence" from a read-only user without the schedule edit right', () => {
    expect(keysOf(buildContext(WorkScheduleEntryType.Work))).not.toContain('coverAbsence');
  });

  it('hides "cover absence" on a break cell', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    expect(keysOf(buildContext(WorkScheduleEntryType.Break))).not.toContain('coverAbsence');
  });

  it('offers taking back a move only on a moved work', () => {
    held.add(PERMISSIONS.CanEditSchedule);
    const moved = buildContext(WorkScheduleEntryType.Work);
    moved.entry!.movedFromClientId = 'origin-1';

    expect(keysOf(moved)).toContain('reverseMove');
    expect(keysOf(buildContext(WorkScheduleEntryType.Work))).not.toContain('reverseMove');
  });

  it('offers no take-back when the person the work came from is not among the loaded clients', () => {
    held.add(PERMISSIONS.CanEditSchedule);
    const hiddenOrigin = buildContext(WorkScheduleEntryType.Work);
    hiddenOrigin.entry!.movedFromClientId = 'hidden-1';

    expect(keysOf(hiddenOrigin)).not.toContain('reverseMove');
  });

  it('offers no take-back on a locked moved work or to a read-only user', () => {
    const lockedMoved = buildContext(WorkScheduleEntryType.Work, 1);
    lockedMoved.entry!.movedFromClientId = 'origin-1';
    held.add(PERMISSIONS.CanEditSchedule);
    expect(keysOf(lockedMoved)).not.toContain('reverseMove');

    held.clear();
    const readOnly = buildContext(WorkScheduleEntryType.Work);
    readOnly.entry!.movedFromClientId = 'origin-1';
    expect(keysOf(readOnly)).not.toContain('reverseMove');
  });

  it('hides "cover absence" on a locked work cell, which the engine could only report as locked', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    expect(keysOf(buildContext(WorkScheduleEntryType.Work, 1))).not.toContain('coverAbsence');
  });
});

describe('ScheduleContextMenuService - expenses entry', () => {
  let service: ScheduleContextMenuService;
  let held: Set<string>;

  beforeEach(() => {
    held = new Set<string>();
    const hasPermission = (permission: string): boolean => held.has(permission);

    TestBed.configureTestingModule({
      providers: [
        ScheduleContextMenuService,
        { provide: TranslateService, useValue: { currentLang: 'en', instant: (key: string) => key } },
        { provide: BaseCellManipulationService, useValue: { hasClipboardData: () => false } },
        { provide: DataManagementScheduleService, useValue: { shiftSchedules: [] } },
        { provide: AbsenceMenuService, useValue: { getAbsenceMenuItems: () => [] } },
        { provide: WorkLockLevelService, useValue: { canUnconfirm: () => false, canConfirm: () => false } },
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

  const keysOf = (entryType: WorkScheduleEntryType): string[] => {
    const entry = new ScheduleCell();
    entry.entryType = entryType;
    entry.lockLevel = 0;
    entry.isGroupRestricted = false;

    return service
      .createContextMenu({
        row: 0,
        column: 0,
        entry,
        dataService: {
          isCellOutsideMembershipPeriod: () => false,
          isCellOutsideGroupPeriod: () => false,
        } as unknown as ScheduleDataService,
      })
      .list.map((item) => item.key);
  };

  it('lets a planner edit and delete an expense, whose endpoints carry no role gate', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    const keys = keysOf(WorkScheduleEntryType.Expenses);

    expect(keys).toContain('edit');
    expect(keys).toContain('del');
  });

  it('lets a planner edit and delete schedule notes and keyword commands, whose endpoints carry no role gate', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    for (const entryType of [WorkScheduleEntryType.ScheduleNote, WorkScheduleEntryType.ScheduleCommand]) {
      const keys = keysOf(entryType);
      expect(keys).toContain('edit');
      expect(keys).toContain('del');
    }
  });

  it('lets a planner delete a work change, whose endpoint carries no role gate', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    expect(keysOf(WorkScheduleEntryType.WorkChange)).toContain('del');
  });
});
describe('ScheduleContextMenuService - confirm only after the service has ended', () => {
  let service: ScheduleContextMenuService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T13:00:00Z'));
    setCompanyTimeZone('UTC');

    TestBed.configureTestingModule({
      providers: [
        ScheduleContextMenuService,
        WorkLockLevelService,
        { provide: TranslateService, useValue: { currentLang: 'en', instant: (key: string) => key } },
        { provide: BaseCellManipulationService, useValue: { hasClipboardData: () => false } },
        { provide: DataManagementScheduleService, useValue: { shiftSchedules: [] } },
        { provide: AbsenceMenuService, useValue: { getAbsenceMenuItems: () => [] } },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: () => false, hasAnyPermission: () => false },
        },
      ],
    });

    service = TestBed.inject(ScheduleContextMenuService);
  });

  afterEach(() => {
    vi.useRealTimers();
    setCompanyTimeZone(null);
  });

  const confirmItem = (entryType: WorkScheduleEntryType, day: Date, start: string, end: string) => {
    const entry = new ScheduleCell();
    entry.entryType = entryType;
    entry.entryDate = day;
    entry.startTime = start;
    entry.endTime = end;
    entry.lockLevel = 0;
    entry.isGroupRestricted = false;
    entry.entryId = 'shift-1';
    entry.sourceId = 'work-1';

    return service
      .createContextMenu({
        row: 0,
        column: 0,
        entry,
        dataService: {
          isCellOutsideMembershipPeriod: () => false,
          isCellOutsideGroupPeriod: () => false,
          isColumnSealed: () => false,
          isColumnOutsideScenario: () => false,
          getAllEntriesForClientAndColumn: () => [],
        } as unknown as ScheduleDataService,
      })
      .list.find((item) => item.key === 'confirm');
  };

  it('keeps "confirm" in the menu but disabled, with the reason, while the service has not ended', () => {
    const item = confirmItem(WorkScheduleEntryType.Work, new Date(2026, 10, 2), '08:00:00', '16:00:00');

    expect(item).toBeDefined();
    expect(item?.disabled).toBe(true);
    expect(item?.subText).toBe('contextMenu.confirmNotEnded');
  });

  it('offers "confirm" for a service of an earlier day', () => {
    const item = confirmItem(WorkScheduleEntryType.Work, new Date(2026, 10, 1), '08:00:00', '16:00:00');

    expect(item?.disabled).toBe(false);
    expect(item?.subText).toBeUndefined();
  });

  it('keeps a night shift of yesterday disabled until it ends on the company clock', () => {
    const item = confirmItem(WorkScheduleEntryType.Work, new Date(2026, 10, 1), '22:00:00', '14:00:00');

    expect(item?.disabled).toBe(true);
  });

  it('does not hold back the confirmation of an absence', () => {
    const item = confirmItem(WorkScheduleEntryType.Break, new Date(2026, 10, 5), '00:00:00', '23:59:00');

    expect(item?.disabled).toBe(false);
  });
});
