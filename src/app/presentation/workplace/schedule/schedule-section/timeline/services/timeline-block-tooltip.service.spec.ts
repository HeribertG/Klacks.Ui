// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

import { ScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { BreakBlockRendererService } from '../renderers/break-block-renderer.service';
import { WorkBlockRendererService } from '../renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../renderers/work-change-block-renderer.service';
import { MovedFromNoteService } from '../../services/moved-from-note.service';
import { TimelineBlockTooltipService } from './timeline-block-tooltip.service';

const EXPENSE_TOOLTIP_KEY = 'workChange.tooltip.expenses';
const ALLOWANCE_TOOLTIP_KEY = 'workChange.tooltip.reimbursement';
const START_TIME = '08:00';
const END_TIME = '09:00';
const MOVED_FROM_NOTE = 'Taken over from Elsa Meier';

describe('TimelineBlockTooltipService', () => {
  let service: TimelineBlockTooltipService;

  function expenseEntry(taxable: boolean): ScheduleCell {
    return Object.assign(new ScheduleCell(), {
      entryType: WorkScheduleEntryType.Expenses,
      taxable,
      startTime: START_TIME,
      endTime: END_TIME,
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TimelineBlockTooltipService,
        { provide: WorkBlockRendererService, useValue: { getLabel: vi.fn() } },
        { provide: WorkChangeBlockRendererService, useValue: { getLabel: vi.fn() } },
        { provide: BreakBlockRendererService, useValue: { getLabel: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        {
          provide: MovedFromNoteService,
          useValue: { noteFor: (entry: ScheduleCell) => (entry.movedFromClientId ? MOVED_FROM_NOTE : '') },
        },
      ],
    });
    service = TestBed.inject(TimelineBlockTooltipService);
  });

  it('labels a non-taxable expense (Spesen) with the expenses key', () => {
    const tooltip = service.buildBlockTooltip(expenseEntry(false));

    expect(tooltip?.split('\n')[0]).toBe(EXPENSE_TOOLTIP_KEY);
  });

  it('ends a moved work with the same "taken over from" note as the grid', () => {
    const moved = Object.assign(new ScheduleCell(), {
      entryType: WorkScheduleEntryType.Work,
      movedFromClientId: 'origin-1',
      startTime: START_TIME,
      endTime: END_TIME,
    });

    expect(service.buildBlockTooltip(moved)?.split('\n').at(-1)).toBe(MOVED_FROM_NOTE);
  });

  it('adds no note to a work that was not moved', () => {
    const work = Object.assign(new ScheduleCell(), {
      entryType: WorkScheduleEntryType.Work,
      startTime: START_TIME,
      endTime: END_TIME,
    });

    expect(service.buildBlockTooltip(work)).not.toContain(MOVED_FROM_NOTE);
  });

  it('labels a taxable allowance (Verguetung) with the reimbursement key', () => {
    const tooltip = service.buildBlockTooltip(expenseEntry(true));

    expect(tooltip?.split('\n')[0]).toBe(ALLOWANCE_TOOLTIP_KEY);
  });
});
