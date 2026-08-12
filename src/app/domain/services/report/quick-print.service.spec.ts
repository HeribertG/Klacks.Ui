// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { QuickPrintOutcome, QuickPrintService } from './quick-print.service';
import { ReportDefaultsService } from './report-defaults.service';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';

describe('QuickPrintService', () => {
  let service: QuickPrintService;
  let reportApi: { getTemplateById: ReturnType<typeof vi.fn> };
  let defaults: {
    isLoaded: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    hasDefault: ReturnType<typeof vi.fn>;
    getDefaultTemplateId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    reportApi = { getTemplateById: vi.fn() };
    defaults = {
      isLoaded: vi.fn(() => true),
      load: vi.fn(() => Promise.resolve()),
      hasDefault: vi.fn(() => false),
      getDefaultTemplateId: vi.fn(() => undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataReportApiService, useValue: reportApi },
        { provide: ReportDefaultsService, useValue: defaults },
      ],
    });
    service = TestBed.inject(QuickPrintService);
  });

  it('loads the defaults only when they are not loaded yet', async () => {
    defaults.isLoaded.mockReturnValue(false);
    await service.ensureDefaultsLoaded();
    expect(defaults.load).toHaveBeenCalledTimes(1);

    defaults.isLoaded.mockReturnValue(true);
    await service.ensureDefaultsLoaded();
    expect(defaults.load).toHaveBeenCalledTimes(1);
  });

  it('exposes whether a default template is configured', () => {
    defaults.hasDefault.mockReturnValue(true);
    expect(service.hasDefault('group')).toBe(true);
    expect(defaults.hasDefault).toHaveBeenCalledWith('group');
  });

  it('reports a missing default template without calling the API', async () => {
    const outcome = await service.print({ sourceId: 'group', fallbackDataSetIds: ['groups'], params: {} });

    expect(outcome).toBe(QuickPrintOutcome.NoDefaultTemplate);
    expect(reportApi.getTemplateById).not.toHaveBeenCalled();
  });

  it('reports a template that no longer exists', async () => {
    defaults.getDefaultTemplateId.mockReturnValue('gone');
    reportApi.getTemplateById.mockResolvedValue(undefined);

    const outcome = await service.print({ sourceId: 'group', fallbackDataSetIds: ['groups'], params: {} });

    expect(outcome).toBe(QuickPrintOutcome.TemplateNotFound);
  });

  it('reports a failing template lookup as not found', async () => {
    defaults.getDefaultTemplateId.mockReturnValue('broken');
    reportApi.getTemplateById.mockRejectedValue(new Error('404'));

    const outcome = await service.print({ sourceId: 'group', fallbackDataSetIds: ['groups'], params: {} });

    expect(outcome).toBe(QuickPrintOutcome.TemplateNotFound);
  });
});
