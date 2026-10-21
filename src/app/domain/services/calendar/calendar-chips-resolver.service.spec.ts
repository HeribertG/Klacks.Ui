// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CalendarChipsResolverService } from './calendar-chips-resolver.service';
import { GroupSelectionService } from '../group/group-selection.service';
import { AppSettingsManagementService } from '../settings/app-settings-management.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { buildOfficialOverrideKey } from 'src/app/domain/helpers/official-override-key.helper';

describe('CalendarChipsResolverService', () => {
  let service: CalendarChipsResolverService;
  let getCalendarSelection: ReturnType<typeof vi.fn>;
  let groupSelection: { selectedGroup: { calendarSelectionId?: string } | undefined };
  let globalCalendarSelectionId: string | undefined;

  beforeEach(() => {
    getCalendarSelection = vi.fn();
    groupSelection = { selectedGroup: undefined };
    globalCalendarSelectionId = 'global-selection';
    TestBed.configureTestingModule({
      providers: [
        { provide: GroupSelectionService, useValue: groupSelection },
        {
          provide: AppSettingsManagementService,
          useValue: { contactSettings: () => ({ globalCalendarSelectionId }) },
        },
        { provide: DataCalendarSelectionService, useValue: { getCalendarSelection } },
      ],
    });
    service = TestBed.inject(CalendarChipsResolverService);
  });

  it('turns every calendar of the group selection into a token and an override entry', async () => {
    groupSelection.selectedGroup = { calendarSelectionId: 'group-selection' };
    getCalendarSelection.mockReturnValue(
      of({
        selectedCalendars: [
          { country: 'CH', state: 'BE', officialOverride: true },
          { country: 'DE', state: 'BY', officialOverride: null },
        ],
      }),
    );

    const { tokens, overrides } = await service.resolveActiveSelection();

    expect(getCalendarSelection).toHaveBeenCalledWith('group-selection');
    expect(tokens.map((t) => `${t.country}/${t.state}`)).toEqual(['CH/BE', 'DE/BY']);
    expect([...overrides.entries()]).toEqual([
      [buildOfficialOverrideKey('CH', 'BE'), true],
      [buildOfficialOverrideKey('DE', 'BY'), null],
    ]);
  });

  it('falls back to the global calendar selection when the group has none', async () => {
    groupSelection.selectedGroup = {};
    getCalendarSelection.mockReturnValue(of({ selectedCalendars: [] }));

    await service.resolveActiveSelection();

    expect(getCalendarSelection).toHaveBeenCalledWith('global-selection');
  });

  it('resolves no chips without any calendar selection and does not call the API', async () => {
    globalCalendarSelectionId = undefined;

    const { tokens, overrides } = await service.resolveActiveSelection();

    expect(getCalendarSelection).not.toHaveBeenCalled();
    expect(tokens).toEqual([]);
    expect(overrides.size).toBe(0);
  });

  it('resolves no chips for an empty selection or a failed read', async () => {
    getCalendarSelection.mockReturnValueOnce(of(undefined));
    getCalendarSelection.mockReturnValueOnce(throwError(() => new Error('404')));

    const empty = await service.resolveActiveSelection();
    const failed = await service.resolveActiveSelection();

    expect(empty.tokens).toEqual([]);
    expect(failed.tokens).toEqual([]);
    expect(failed.overrides.size).toBe(0);
  });
});
