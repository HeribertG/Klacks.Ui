// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Prepares the per-group statistics of the dashboard charts. Client and shift counts come from the flattened group
 * tree (every group, depth first) and leave out groups with a count of zero; shift coverage leaves out groups without
 * any slot. Errors of the reads propagate to the caller.
 */

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { flattenGroupTree } from 'src/app/domain/helpers/group-tree.helper';
import { GroupCount } from 'src/app/domain/models/dashboard/group-count.interface';
import { IGroup } from 'src/app/domain/models/group/group.interface';
import { IShiftCoverageStatistics } from 'src/app/domain/models/shift-coverage-statistics.interface';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';

@Injectable({ providedIn: 'root' })
export class DashboardStatisticsService {
  private dataDashboardService = inject(DataDashboardService);

  loadCustomerCountsByGroup(): Observable<GroupCount[]> {
    return this.loadCountsByGroup((group) => group.customersCount);
  }

  loadShiftCountsByGroup(): Observable<GroupCount[]> {
    return this.loadCountsByGroup((group) => group.shiftsCount);
  }

  loadCoverageOfGroupsWithSlots(): Observable<IShiftCoverageStatistics[]> {
    return this.dataDashboardService
      .getShiftCoverageStatistics()
      .pipe(map((statistics) => statistics.filter((s) => s.totalSlots > 0)));
  }

  private loadCountsByGroup(countOf: (group: IGroup) => number): Observable<GroupCount[]> {
    return this.dataDashboardService.getClientsOverviewData().pipe(
      map((tree) =>
        flattenGroupTree(tree.nodes || [])
          .filter((group) => countOf(group) > 0)
          .map((group) => ({ label: group.name, value: countOf(group) }))
      )
    );
  }
}
