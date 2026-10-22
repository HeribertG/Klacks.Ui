// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Completes a locally known shift pool with the shifts it lacks: fetches only the ids not in the pool and appends them.
 * A failed fetch is treated as "nothing found", so the caller continues with the local pool.
 * @param localShiftPool - Shifts already loaded on the client
 * @param requiredShiftIds - Ids the caller needs; ids already in the pool are not fetched again
 */

import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';

@Injectable({ providedIn: 'root' })
export class ShiftPoolCompletionService {
  private dataShiftService = inject(DataShiftService);

  completePool(localShiftPool: IShift[], requiredShiftIds: string[]): Observable<IShift[]> {
    const missingIds = requiredShiftIds.filter((id) => !localShiftPool.some((shift) => shift.id === id));

    if (missingIds.length === 0) {
      return of(localShiftPool);
    }

    return this.dataShiftService.getShiftsByIds(missingIds).pipe(
      catchError(() => of([] as IShift[])),
      map((fetchedShifts) => [...localShiftPool, ...fetchedShifts])
    );
  }
}
