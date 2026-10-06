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

describe('RowHeaderReportService - cover absence', () => {
  let service: RowHeaderReportService;
  let held: Set<string>;
  let requestOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    held = new Set<string>();
    requestOpen = vi.fn();
    const hasPermission = (permission: string): boolean => held.has(permission);

    TestBed.configureTestingModule({
      providers: [
        RowHeaderReportService,
        { provide: ScheduleReportContextService, useValue: {} },
        { provide: ReportDefaultsService, useValue: { hasDefault: () => false } },
        { provide: AppSettingsManagementService, useValue: { emailSettings: () => ({}) } },
        { provide: ToastShowService, useValue: {} },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: BaseDataService,
          useValue: {
            rows: 2,
            rowGroupIndex: [0, 1],
            getGroupIndex: (index: number) => [{ id: 'client-a' }, { id: '' }][index],
          },
        },
        { provide: DataManagementScheduleService, useValue: {} },
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

  const menuKeys = (): string[] => service.createContextMenu().list.map((item) => item.key);

  it('offers "cover absence" in the row menu to anyone who may edit the schedule (planner floor)', () => {
    held.add(PERMISSIONS.CanEditSchedule);

    expect(menuKeys()).toContain('coverAbsence');
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
