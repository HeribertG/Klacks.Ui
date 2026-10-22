// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { buildOfficialOverrideKey } from 'src/app/domain/helpers/official-override-key.helper';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { CalendarSelectionChipsService } from './calendar-selection-chips.service';

describe('CalendarSelectionChipsService', () => {
  let getCalendarSelection: ReturnType<typeof vi.fn>;
  let service: CalendarSelectionChipsService;

  beforeEach(() => {
    getCalendarSelection = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        CalendarSelectionChipsService,
        { provide: DataCalendarSelectionService, useValue: { getCalendarSelection } },
      ],
    });
    service = TestBed.inject(CalendarSelectionChipsService);
  });

  it('turns every selected calendar into a token and an override entry', async () => {
    getCalendarSelection.mockReturnValue(
      of({ selectedCalendars: [{ country: 'CH', state: 'ZH', officialOverride: false }] })
    );

    const { tokens, overrides } = await service.resolve('selection-1');

    expect(getCalendarSelection).toHaveBeenCalledWith('selection-1');
    expect(tokens.map((t) => `${t.country}/${t.state}`)).toEqual(['CH/ZH']);
    expect(overrides.get(buildOfficialOverrideKey('CH', 'ZH'))).toBe(false);
  });

  it('yields no chips and reads nothing without a selection id', async () => {
    const chips = await service.resolve(undefined);

    expect(chips.tokens).toEqual([]);
    expect(chips.overrides.size).toBe(0);
    expect(getCalendarSelection).not.toHaveBeenCalled();
  });

  it('yields no chips for an empty selection or a failed read', async () => {
    getCalendarSelection.mockReturnValue(of({ selectedCalendars: [] }));
    expect((await service.resolve('empty')).tokens).toEqual([]);

    getCalendarSelection.mockReturnValue(throwError(() => new Error('down')));
    expect((await service.resolve('broken')).tokens).toEqual([]);
  });
});
