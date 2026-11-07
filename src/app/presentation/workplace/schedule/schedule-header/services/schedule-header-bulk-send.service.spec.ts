// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ScheduleHeaderBulkSendService } from './schedule-header-bulk-send.service';

describe('ScheduleHeaderBulkSendService', () => {
  let service: ScheduleHeaderBulkSendService;
  let sendForAllClients: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendForAllClients = vi.fn().mockResolvedValue({ success: 1, failed: 0, noEmail: 0 });

    TestBed.configureTestingModule({
      providers: [
        ScheduleHeaderBulkSendService,
        {
          provide: DataManagementScheduleService,
          useValue: {
            clients: [
              { id: 'p1', firstName: 'Anna', name: 'Muster', type: EntityTypeEnum.employee },
              { id: 's1', firstName: '', name: 'Messe 1', type: EntityTypeEnum.standIn },
              { id: 'x1', firstName: 'Marco', name: 'Rossi', type: EntityTypeEnum.externEmp },
            ],
            visibleStartDate: new Date(2026, 10, 1),
            visibleEndDate: new Date(2026, 10, 30),
          },
        },
        { provide: AppSettingsManagementService, useValue: { emailSettings: () => ({}) } },
        { provide: ScheduleReportContextService, useValue: { sendForAllClients } },
        { provide: ScheduleChangeService, useValue: { hasDirtyClients: () => true } },
        { provide: ToastShowService, useValue: { showInfo: vi.fn(), showError: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
    service = TestBed.inject(ScheduleHeaderBulkSendService);
  });

  it('excludes stand-ins from the recipients of the bulk send', async () => {
    await service.onSendAllSchedules();

    expect(sendForAllClients).toHaveBeenCalledWith(
      [
        { id: 'p1', name: 'Anna Muster' },
        { id: 'x1', name: 'Marco Rossi' },
      ],
      '2026-11-01',
      '2026-11-30',
    );
  });
});
