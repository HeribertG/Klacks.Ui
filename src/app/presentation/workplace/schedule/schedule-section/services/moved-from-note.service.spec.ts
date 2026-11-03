// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { ScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { MovedFromNoteService } from './moved-from-note.service';

describe('MovedFromNoteService', () => {
  let service: MovedFromNoteService;

  const entry = (movedFromClientId: string | null): ScheduleCell =>
    Object.assign(new ScheduleCell(), { movedFromClientId });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslateService,
          useValue: { instant: (key: string, params?: { name?: string }) => (params?.name ? `${key}:${params.name}` : key) },
        },
        { provide: DataManagementScheduleService, useValue: { clients: [{ id: 'origin-1', firstName: 'Elsa', name: 'Meier' }] } },
      ],
    });
    service = TestBed.inject(MovedFromNoteService);
  });

  it('names a loaded origin person and counts it as visible', () => {
    expect(service.noteFor(entry('origin-1'))).toBe('schedule.moved-from:Elsa Meier');
    expect(service.isOriginVisible(entry('origin-1'))).toBe(true);
  });

  it('keeps an origin outside the loaded clients unnamed and not visible', () => {
    expect(service.noteFor(entry('hidden-1'))).toBe('schedule.moved-from-hidden');
    expect(service.isOriginVisible(entry('hidden-1'))).toBe(false);
  });

  it('has no note for a work that was not moved', () => {
    expect(service.noteFor(entry(null))).toBe('');
    expect(service.isOriginVisible(entry(null))).toBe(false);
  });
});
