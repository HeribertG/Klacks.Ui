// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Looks up which of the given shifts Klacksy's remediation already handled and returns the answers keyed by shift id.
 * Shifts without an id (not yet saved) are not asked for.
 * @param shifts - Shifts currently on screen
 */

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { IProactiveShiftAttribution } from 'src/app/domain/models/assistant/proactive-shift-attribution.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataProactiveAttributionService } from 'src/app/infrastructure/api/assistant/data-proactive-attribution.service';

@Injectable({ providedIn: 'root' })
export class ProactiveShiftAttributionService {
  private dataProactiveAttributionService = inject(DataProactiveAttributionService);

  loadByShift(shifts: IShift[]): Observable<ReadonlyMap<string, IProactiveShiftAttribution>> {
    const entityIds = shifts.map((shift) => shift.id).filter((id): id is string => !!id);

    return this.dataProactiveAttributionService
      .getByEntityIds(entityIds)
      .pipe(map((attributions) => new Map(attributions.map((attribution) => [attribution.entityId, attribution]))));
  }
}
