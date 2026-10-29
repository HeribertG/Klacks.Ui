// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Applies the "view" request of the shift list URL (orders intake or plannable shifts with an optional validity window)
 * to the list filter as a transient override and removes the request parameters from the URL again.
 * @param allShiftStateService - Applies the override to the filter and keeps it out of the stored filter
 * @param authorizationService - Decides whether the user may open the order intake
 * @param router - Removes the request parameters from the URL
 * @param activatedRoute - Route the parameters are removed from
 */

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import {
  SHIFT_LIST_FROM_QUERY_PARAM,
  SHIFT_LIST_UNTIL_QUERY_PARAM,
  SHIFT_LIST_VIEW,
  SHIFT_LIST_VIEW_QUERY_PARAM,
} from 'src/app/domain/constants/shift-list-view.constants';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { IShiftFilter } from 'src/app/domain/models/shift/shift-filter.interface';
import { AllShiftStateService } from './all-shift-state.service';

@Injectable()
export class ShiftListViewRequestService {
  private readonly allShiftStateService = inject(AllShiftStateService);
  private readonly authorizationService = inject(AuthorizationService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  /**
   * Applied after the stored filter was restored, otherwise the restore would overwrite it. The request
   * parameters are removed again so that a later request with the same values is a new navigation the list
   * reacts to. The override is transient: it is not written to the stored filter.
   * @param queryParamMap - Query parameters of the current navigation
   * @returns Whether the filter was changed
   */
  apply(queryParamMap: ParamMap): boolean {
    const view = queryParamMap.get(SHIFT_LIST_VIEW_QUERY_PARAM);
    if (view !== SHIFT_LIST_VIEW.Orders && view !== SHIFT_LIST_VIEW.Plannable) {
      return false;
    }

    this.removeRequestParams();
    const changes = view === SHIFT_LIST_VIEW.Orders ? this.ordersChanges() : this.plannableChanges(queryParamMap);
    if (!changes) {
      return false;
    }

    this.allShiftStateService.applyTransientOverride(changes);
    return true;
  }

  /**
   * Only for users who may edit shifts: the nav keeps the order view disabled for everyone else and switches
   * them to the plannable shifts.
   */
  private ordersChanges(): Partial<IShiftFilter> | null {
    if (!this.authorizationService.hasPermission(PERMISSIONS.CanEditShifts)) {
      return null;
    }
    return { filterType: ShiftFilterType.Original, isSealedOrder: false };
  }

  /**
   * The validity window is combined with the active/former/future flags by the backend, so a window opens all
   * three of them and lets the window alone decide; without a window the default (active shifts) applies.
   * An unparsable date is ignored, and so are both dates when the window is reversed.
   */
  private plannableChanges(queryParamMap: ParamMap): Partial<IShiftFilter> {
    const parsedFrom = parseCalendarDate(queryParamMap.get(SHIFT_LIST_FROM_QUERY_PARAM));
    const parsedUntil = parseCalendarDate(queryParamMap.get(SHIFT_LIST_UNTIL_QUERY_PARAM));
    const isReversed = parsedFrom !== null && parsedUntil !== null && parsedFrom > parsedUntil;
    const validFrom = isReversed ? undefined : (parsedFrom ?? undefined);
    const validUntil = isReversed ? undefined : (parsedUntil ?? undefined);
    const hasWindow = validFrom !== undefined || validUntil !== undefined;

    return {
      filterType: ShiftFilterType.Shift,
      isTimeRange: true,
      isSporadic: true,
      activeDateRange: true,
      formerDateRange: hasWindow,
      futureDateRange: hasWindow,
      validFrom,
      validUntil,
    };
  }

  private removeRequestParams(): void {
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        [SHIFT_LIST_VIEW_QUERY_PARAM]: null,
        [SHIFT_LIST_FROM_QUERY_PARAM]: null,
        [SHIFT_LIST_UNTIL_QUERY_PARAM]: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
