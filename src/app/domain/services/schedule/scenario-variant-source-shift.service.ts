// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the real shifts that can be copied into a variant (key): the sealed orders of the key's group and its subgroups
 * that are valid in the key's period and that the server would accept. It owns this filter so the copy dialog neither
 * calls the API directly nor reuses the paged state of the shift list page, which a read here would overwrite.
 * The shift list matches exactly one group per request (no subgroups) and also returns shifts without any group, so the
 * key group and each subgroup are read separately, merged without duplicates, and shifts without a group or with a
 * group outside the key's hierarchy are left out, because the server refuses a copy of those. The three date range
 * flags are all on so the validity period of the key alone decides: with "former" off a key with a period in the past
 * would not see the shifts that ended before today.
 * @param variant - The key the shifts are meant for; its group and period decide what is offered
 */

import { inject, Injectable } from '@angular/core';
import { from, map, mergeMap, Observable, toArray } from 'rxjs';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { groupHierarchyIds } from 'src/app/domain/helpers/group-tree.helper';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IShiftListFilter } from 'src/app/domain/models/shift/shift-list-filter.interface';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { FULL_LIST_PAGINATION } from 'src/app/domain/services/report/report-data-provider.constants';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';

const MAX_PARALLEL_GROUP_READS = 4;

@Injectable({
  providedIn: 'root',
})
export class ScenarioVariantSourceShiftService {
  private dataShiftService = inject(DataShiftService);
  private groupService = inject(DataManagementGroupService);

  loadSealedShifts(variant: IScenarioVariant): Observable<IShift[]> {
    const hierarchyIds = groupHierarchyIds(this.groupService.flatNodeList, variant.groupId);

    return from(hierarchyIds).pipe(
      mergeMap(
        (groupId) => this.dataShiftService.readShiftList(this.buildFilter(variant, groupId)),
        MAX_PARALLEL_GROUP_READS,
      ),
      toArray(),
      map((responses) => this.mergeCopyable(responses.flatMap((response) => response.shifts), hierarchyIds)),
    );
  }

  private buildFilter(variant: IScenarioVariant, groupId: string): IShiftListFilter {
    return {
      searchString: '',
      orderBy: 'name',
      sortOrder: 'asc',
      ...FULL_LIST_PAGINATION,
      activeDateRange: true,
      formerDateRange: true,
      futureDateRange: true,
      showDeleteEntries: false,
      filterType: ShiftFilterType.Original,
      isSealedOrder: true,
      selectedGroup: groupId,
      validFrom: parseCalendarDate(variant.fromDate) ?? undefined,
      validUntil: parseCalendarDate(variant.untilDate) ?? undefined,
    };
  }

  private mergeCopyable(shifts: IShift[], hierarchyIds: readonly string[]): IShift[] {
    const byId = new Map<string, IShift>();

    shifts.forEach((shift) => {
      if (shift.id && !byId.has(shift.id) && this.isCopyable(shift, hierarchyIds)) {
        byId.set(shift.id, shift);
      }
    });

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private isCopyable(shift: IShift, hierarchyIds: readonly string[]): boolean {
    const groups = shift.groups ?? [];
    return groups.length > 0 && groups.every((group) => !!group.id && hierarchyIds.includes(group.id));
  }
}
