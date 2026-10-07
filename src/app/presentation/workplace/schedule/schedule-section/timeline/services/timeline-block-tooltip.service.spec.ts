// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

import { ScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { BreakBlockRendererService } from '../renderers/break-block-renderer.service';
import { WorkBlockRendererService } from '../renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../renderers/work-change-block-renderer.service';
import { TimelineBlockTooltipService } from './timeline-block-tooltip.service';

const EXPENSE_TOOLTIP_KEY = 'workChange.tooltip.expenses';
const ALLOWANCE_TOOLTIP_KEY = 'workChange.tooltip.reimbursement';
const START_TIME = '08:00';
const END_TIME = '09:00';

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
      ],
    });
    service = TestBed.inject(TimelineBlockTooltipService);
  });

  it('labels a non-taxable expense (Spesen) with the expenses key', () => {
    const tooltip = service.buildBlockTooltip(expenseEntry(false));

    expect(tooltip?.split('\n')[0]).toBe(EXPENSE_TOOLTIP_KEY);
  });

  it('labels a taxable allowance (Verguetung) with the reimbursement key', () => {
    const tooltip = service.buildBlockTooltip(expenseEntry(true));

    expect(tooltip?.split('\n')[0]).toBe(ALLOWANCE_TOOLTIP_KEY);
  });
});
