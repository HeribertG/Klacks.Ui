// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Resolves the holiday calendar chips of the calendar selection that applies right now: the selected group's
 * selection, else the global one from the contact settings. Each selected calendar becomes a state/country token and
 * an official-override entry; no selection, an empty one or a failed read yields no chips.
 */
import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';
import { OfficialOverrideMap } from 'src/app/domain/models/calendar/official-override-map.type';
import { ResolvedCalendarChips } from 'src/app/domain/models/calendar/resolved-calendar-chips.interface';
import { buildOfficialOverrideKey } from 'src/app/domain/helpers/official-override-key.helper';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { GroupSelectionService } from '../group/group-selection.service';
import { AppSettingsManagementService } from '../settings/app-settings-management.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarChipsResolverService {
  private groupSelectionService = inject(GroupSelectionService);
  private appSettingsService = inject(AppSettingsManagementService);
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);

  async resolveActiveSelection(): Promise<ResolvedCalendarChips> {
    const calendarSelectionId =
      this.groupSelectionService.selectedGroup?.calendarSelectionId ||
      this.appSettingsService.contactSettings().globalCalendarSelectionId;

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
