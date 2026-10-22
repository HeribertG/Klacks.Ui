// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Turns one calendar selection into holiday calendar chips: each selected calendar becomes a state/country token and
 * an official-override entry. No selection id, an empty selection or a failed read yields no chips.
 * @param calendarSelectionId - Id of the calendar selection to resolve
 */
import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { buildOfficialOverrideKey } from 'src/app/domain/helpers/official-override-key.helper';
import { OfficialOverrideMap } from 'src/app/domain/models/calendar/official-override-map.type';
import { ResolvedCalendarChips } from 'src/app/domain/models/calendar/resolved-calendar-chips.interface';
import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarSelectionChipsService {
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);

  async resolve(calendarSelectionId: string | null | undefined): Promise<ResolvedCalendarChips> {
    if (!calendarSelectionId) {
      return { tokens: [], overrides: new Map() };
    }

    try {
      const selection = await lastValueFrom(
        this.dataCalendarSelectionService.getCalendarSelection(calendarSelectionId)
      );

      if (!selection?.selectedCalendars?.length) {
        return { tokens: [], overrides: new Map() };
      }

      const tokens: StateCountryToken[] = [];
      const overrides: OfficialOverrideMap = new Map();
      selection.selectedCalendars.forEach((sc) => {
        const token = new StateCountryToken();
        token.country = sc.country;
        token.state = sc.state;
        tokens.push(token);
        overrides.set(
          buildOfficialOverrideKey(sc.country, sc.state),
          sc.officialOverride
        );
      });
      return { tokens, overrides };
    } catch {
      return { tokens: [], overrides: new Map() };
    }
  }
}
