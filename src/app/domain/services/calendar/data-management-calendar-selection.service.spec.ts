// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection.interface';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { DataManagementCalendarSelectionService } from './data-management-calendar-selection.service';

describe('DataManagementCalendarSelectionService remembered selection', () => {
  const KEY = 'Gantt-Calendar';
  let service: DataManagementCalendarSelectionService;
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage = { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        DataManagementCalendarSelectionService,
        { provide: EVENT_BUS_TOKEN, useValue: { publish: vi.fn() } },
        { provide: LocalStorageService, useValue: storage },
        { provide: DataCalendarSelectionService, useValue: {} },
        { provide: TranslateService, useValue: { instant: (key: string) => key, onLangChange: new Subject() } },
      ],
    });
    service = TestBed.inject(DataManagementCalendarSelectionService);
  });

  it('forgets the remembered selection when the current one is the internal placeholder', () => {
    service.currentCalendarSelection = { id: 'placeholder', internal: true } as ICalendarSelection;

    service.rememberCurrentSelection();

    expect(storage.remove).toHaveBeenCalledWith(KEY);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('remembers the id of a real selection and ignores a selection without id', () => {
    service.currentCalendarSelection = { id: 'sel-1', internal: false } as ICalendarSelection;
    service.rememberCurrentSelection();

    service.currentCalendarSelection = { internal: false } as ICalendarSelection;
    service.rememberCurrentSelection();

    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledWith(KEY, 'sel-1');
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('finds the remembered selection among the loaded ones', () => {
    const remembered = { id: 'sel-2' } as ICalendarSelection;
    service.calendarsSelections = [{ id: 'sel-1' } as ICalendarSelection, remembered];

    storage.get.mockReturnValue('sel-2');
    expect(service.rememberedSelection()).toBe(remembered);
    expect(storage.get).toHaveBeenCalledWith(KEY);

    storage.get.mockReturnValue('unknown');
    expect(service.rememberedSelection()).toBeUndefined();

    storage.get.mockReturnValue(null);
    expect(service.rememberedSelection()).toBeUndefined();
  });
});
