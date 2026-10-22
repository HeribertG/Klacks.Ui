// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Resolves the holiday calendar chips of the calendar selection that applies right now: the selected group's
 * selection, else the global one from the contact settings. Each selected calendar becomes a state/country token and
 * an official-override entry; no selection, an empty one or a failed read yields no chips.
 */
import { inject, Injectable } from '@angular/core';
import { ResolvedCalendarChips } from 'src/app/domain/models/calendar/resolved-calendar-chips.interface';
import { GroupSelectionService } from '../group/group-selection.service';
import { AppSettingsManagementService } from '../settings/app-settings-management.service';
import { CalendarSelectionChipsService } from './calendar-selection-chips.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarChipsResolverService {
  private groupSelectionService = inject(GroupSelectionService);
  private appSettingsService = inject(AppSettingsManagementService);
  private calendarSelectionChips = inject(CalendarSelectionChipsService);

  resolveActiveSelection(): Promise<ResolvedCalendarChips> {
    const calendarSelectionId =
      this.groupSelectionService.selectedGroup?.calendarSelectionId ||
      this.appSettingsService.contactSettings().globalCalendarSelectionId;

    return this.calendarSelectionChips.resolve(calendarSelectionId);
  }
}
