// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { SettingsListReaderService } from 'src/app/domain/services/settings/settings-list-reader.service';
import { ReportDefaultsService } from './report-defaults.service';

describe('ReportDefaultsService', () => {
  let service: ReportDefaultsService;
  let reportApi: { getAllTemplates: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    reportApi = { getAllTemplates: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ReportDefaultsService,
        { provide: DataReportApiService, useValue: reportApi },
        { provide: DataSettingsVariousService, useValue: {} },
        { provide: SettingsListReaderService, useValue: {} },
      ],
    });
    service = TestBed.inject(ReportDefaultsService);
  });

  it('loads the templates a default can be chosen from', async () => {
    const templates = [{ id: 't-1' }] as ReportTemplate[];
    reportApi.getAllTemplates.mockResolvedValue(templates);

    await expect(service.loadAvailableTemplates()).resolves.toBe(templates);
  });

  it('lets a failed template load reject so the caller can report it', async () => {
    reportApi.getAllTemplates.mockRejectedValue(new Error('offline'));

    await expect(service.loadAvailableTemplates()).rejects.toThrow('offline');
  });
});
