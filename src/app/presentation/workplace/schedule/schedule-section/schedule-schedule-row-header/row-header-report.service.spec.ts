// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RowHeaderReportService } from './row-header-report.service';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { RecoveryDialogLauncherService } from '../../services/recovery-dialog-launcher.service';
import { EntityTypeEnum } from 'src/app/domain/enums/client-enum';

describe('RowHeaderReportService - cover absence', () => {
  let service: RowHeaderReportService;
  let held: Set<string>;
  let requestOpen: ReturnType<typeof vi.fn>;
  let workScheduleEntries: { clientId: string; entryType: number }[];
  let hasScheduleDefault: boolean;
  let readDatas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    held = new Set<string>();
    workScheduleEntries = [];
    hasScheduleDefault = false;
    requestOpen = vi.fn();
    readDatas = vi.fn();
    const hasPermission = (permission: string): boolean => held.has(permission);

    TestBed.configureTestingModule({
      providers: [
        RowHeaderReportService,
        { provide: ScheduleReportContextService, useValue: {} },
        { provide: ReportDefaultsService, useValue: { hasDefault: () => hasScheduleDefault } },
        {
          provide: AppSettingsManagementService,
          useValue: { emailSettings: () => ({ outgoingServer: 'smtp', outgoingServerPort: '587', username: 'u', password: 'p' }) },
        },
        { provide: ToastShowService, useValue: {} },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: BaseDataService,
          useValue: {
            rows: 3,
            rowGroupIndex: [0, 1, 2],
            getGroupIndex: (index: number) =>
              [
                { id: 'client-a', type: EntityTypeEnum.employee, name: 'Ackermann' },
                { id: '' },
                { id: 'stand-in-row', type: EntityTypeEnum.standIn, name: 'Fair 1' },
              ][index],
          },
        },
        { provide: DataManagementScheduleService, useValue: { workScheduleEntries, readDatas } },
        { provide: ScheduleChangeService, useValue: {} },
        {
          provide: AuthorizationService,
          useValue: {
            hasPermission,
            hasAnyPermission: (...permissions: string[]) => permissions.some(hasPermission),
          },
        },
        { provide: RecoveryDialogLauncherService, useValue: { requestOpen } },
      ],
    });

    service = TestBed.inject(RowHeaderReportService);
  });

  const menuKeys = (clientId?: string, type = EntityTypeEnum.employee): string[] =>
    service.createContextMenu(clientId === undefined ? undefined : { id: clientId, type }).list.map((item) => item.key);

  it('offers "cover absence" in the row menu to anyone who may edit the schedule (planner floor)', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    expect(menuKeys()).toContain('coverAbsence');
  });

  it('offers "cover absence" only for an employee that carries a work', () => {
    held.add(PERMISSIONS.CanEditSchedule);
    workScheduleEntries.push({ clientId: 'client-with-work', entryType: 0 }, { clientId: 'client-with-break', entryType: 3 });

    expect(menuKeys('client-with-work')).toContain('coverAbsence');
    expect(menuKeys('client-with-break')).not.toContain('coverAbsence');
    expect(menuKeys('client-without-entries')).not.toContain('coverAbsence');
  });

  it('offers neither "cover absence" nor "send plan" for a stand-in row', () => {
    held.add(PERMISSIONS.CanEditSchedule);
    hasScheduleDefault = true;
    workScheduleEntries.push({ clientId: 'stand-in', entryType: 0 }, { clientId: 'person', entryType: 0 });

    expect(menuKeys('person')).toEqual(expect.arrayContaining(['sendStaffSchedule', 'coverAbsence']));
    expect(menuKeys('stand-in', EntityTypeEnum.standIn)).not.toContain('sendStaffSchedule');
    expect(menuKeys('stand-in', EntityTypeEnum.standIn)).not.toContain('coverAbsence');
    expect(menuKeys('stand-in', EntityTypeEnum.standIn)).toContain('staffSchedule');
  });

  it('offers no shift preferences for a stand-in row, but for a person', () => {
    expect(menuKeys('person')).toContain('shiftPreferences');
    expect(menuKeys('stand-in', EntityTypeEnum.standIn)).not.toContain('shiftPreferences');
  });

  it('offers "convert into employee" for a stand-in row only to whoever may edit clients', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    expect(menuKeys('stand-in', EntityTypeEnum.standIn)).not.toContain('convertStandIn');

    held.add(PERMISSIONS.CanEditClients);

    expect(menuKeys('stand-in', EntityTypeEnum.standIn)).toContain('convertStandIn');
    expect(menuKeys('person')).not.toContain('convertStandIn');
  });

  it('finds the stand-in of a row with its display name and nothing for a person row', () => {
    expect(service.standInAtRow(2)).toEqual({ id: 'stand-in-row', name: 'Fair 1' });
    expect(service.standInAtRow(0)).toBeNull();
    expect(service.standInAtRow(7)).toBeNull();
  });

  it('reloads the rows after a conversion without resetting the scroll position', () => {
    service.reloadAfterStandInConversion();

    expect(readDatas).toHaveBeenCalledWith(false);
  });

  it('hides "cover absence" from a read-only user without the schedule edit right', () => {
    expect(menuKeys()).not.toContain('coverAbsence');
  });

  it('requests the dialog with the employee of the clicked row and no day', () => {
    service.requestAbsenceCover(0);

    expect(requestOpen).toHaveBeenCalledWith({ clientId: 'client-a' });
  });

  it('ignores a row without a resolvable employee', () => {
    service.requestAbsenceCover(1);

    expect(requestOpen).not.toHaveBeenCalled();
  });

  it('ignores a row outside the grid', () => {
    service.requestAbsenceCover(5);

    expect(requestOpen).not.toHaveBeenCalled();
  });
});
