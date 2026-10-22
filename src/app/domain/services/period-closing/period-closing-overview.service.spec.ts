// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { UsedPeriod } from 'src/app/domain/models/period-closing/used-period';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/schedule/data-shift-schedule.service';
import { PeriodClosingOverviewService } from './period-closing-overview.service';

const period: UsedPeriod = {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  paymentInterval: 2,
  groupId: 'g1',
  groupName: 'Group',
};
const bounds = { start: '2026-01-01', end: '2026-01-31' };

describe('PeriodClosingOverviewService', () => {
  let api: {
    getSealedPeriods: ReturnType<typeof vi.fn>;
    getPeriodIssues: ReturnType<typeof vi.fn>;
    getExportLog: ReturnType<typeof vi.fn>;
  };
  let getShiftSchedule: ReturnType<typeof vi.fn>;
  let service: PeriodClosingOverviewService;

  beforeEach(() => {
    api = {
      getSealedPeriods: vi.fn(() => of([{ date: '2026-01-02' }])),
      getPeriodIssues: vi.fn(() => of([{ kind: 'x' }])),
      getExportLog: vi.fn(() => of([{ id: 'e1' }])),
    };
    getShiftSchedule = vi.fn(() =>
      of({
        shifts: [
          { sumEmployees: 2, quantity: 2, engaged: 1 },
          { sumEmployees: 1, quantity: 1, engaged: 3 },
          { sumEmployees: 1, quantity: 2, engaged: 0 },
        ],
        totalCount: 5,
      })
    );
    TestBed.configureTestingModule({
      providers: [
        PeriodClosingOverviewService,
        { provide: DataPeriodClosingService, useValue: api },
        { provide: DataShiftScheduleService, useValue: { getShiftSchedule } },
      ],
    });
    service = TestBed.inject(PeriodClosingOverviewService);
  });

  it('reads summary and issues by the period and shifts and export log by the bounds', async () => {
    await firstValueFrom(service.loadOverview(period, { start: '2025-12-29', end: '2026-02-01' }));

    expect(api.getSealedPeriods).toHaveBeenCalledWith('2026-01-01', '2026-01-31', 'g1');
    expect(api.getPeriodIssues).toHaveBeenCalledWith('2026-01-01', '2026-01-31', 'g1');
    expect(api.getExportLog).toHaveBeenCalledWith('2025-12-29', '2026-02-01');
    expect(getShiftSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: '2025-12-29', endDate: '2026-02-01', selectedGroup: 'g1', rowCount: 10000 })
    );
  });

  it('sums only the positive staffing gaps and flags a truncated shift list', async () => {
    const overview = await firstValueFrom(service.loadOverview(period, bounds));

    expect(overview.unstaffedShiftCount).toBe(5);
    expect(overview.unstaffedShiftTruncated).toBe(true);
    expect(overview.summary).toEqual([{ date: '2026-01-02' }]);
    expect(overview.issues).toEqual([{ kind: 'x' }]);
    expect(overview.exportLogs).toEqual([{ id: 'e1' }]);
  });

  it('passes no group when the period has none', async () => {
    await firstValueFrom(service.loadOverview({ ...period, groupId: null }, bounds));

    expect(getShiftSchedule.mock.calls[0][0].selectedGroup).toBeUndefined();
  });

  it('treats a failed export-log read as no exports', async () => {
    api.getExportLog.mockReturnValue(throwError(() => new Error('down')));

    const overview = await firstValueFrom(service.loadOverview(period, bounds));

    expect(overview.exportLogs).toEqual([]);
  });

  it('propagates any other failed read', async () => {
    api.getPeriodIssues.mockReturnValue(throwError(() => new Error('issues down')));

    await expect(firstValueFrom(service.loadOverview(period, bounds))).rejects.toThrow('issues down');
  });
});
