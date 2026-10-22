// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { IGroup } from 'src/app/domain/models/group/group.interface';
import { IShiftCoverageStatistics } from 'src/app/domain/models/shift-coverage-statistics.interface';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DashboardStatisticsService } from './dashboard-statistics.service';

const group = (name: string, customersCount: number, shiftsCount: number, children?: IGroup[]): IGroup =>
  ({ name, customersCount, shiftsCount, children }) as IGroup;

describe('DashboardStatisticsService', () => {
  let api: { getClientsOverviewData: ReturnType<typeof vi.fn>; getShiftCoverageStatistics: ReturnType<typeof vi.fn> };
  let service: DashboardStatisticsService;

  beforeEach(() => {
    api = {
      getClientsOverviewData: vi.fn(() =>
        of({ nodes: [group('root', 0, 4, [group('child', 3, 0), group('leaf', 2, 1)]), group('other', 5, 0)] })
      ),
      getShiftCoverageStatistics: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [DashboardStatisticsService, { provide: DataDashboardService, useValue: api }],
    });
    service = TestBed.inject(DashboardStatisticsService);
  });

  it('counts customers per group over the whole tree and drops groups without customers', async () => {
    const counts = await firstValueFrom(service.loadCustomerCountsByGroup());

    expect(counts).toEqual([
      { label: 'child', value: 3 },
      { label: 'leaf', value: 2 },
      { label: 'other', value: 5 },
    ]);
  });

  it('counts shifts per group and drops groups without shifts', async () => {
    const counts = await firstValueFrom(service.loadShiftCountsByGroup());

    expect(counts).toEqual([
      { label: 'root', value: 4 },
      { label: 'leaf', value: 1 },
    ]);
  });

  it('treats a tree without nodes as no groups', async () => {
    api.getClientsOverviewData.mockReturnValue(of({}));

    expect(await firstValueFrom(service.loadShiftCountsByGroup())).toEqual([]);
  });

  it('keeps only coverage rows of groups that have slots', async () => {
    api.getShiftCoverageStatistics.mockReturnValue(
      of([
        { groupName: 'a', totalSlots: 0 },
        { groupName: 'b', totalSlots: 3 },
      ] as IShiftCoverageStatistics[])
    );

    const rows = await firstValueFrom(service.loadCoverageOfGroupsWithSlots());

    expect(rows.map((r) => r.groupName)).toEqual(['b']);
  });
});
