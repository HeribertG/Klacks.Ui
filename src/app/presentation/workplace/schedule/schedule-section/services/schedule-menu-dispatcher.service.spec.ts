// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ScheduleMenuDispatcherService, ScheduleMenuHost } from './schedule-menu-dispatcher.service';
import { ScheduleSectionFacadeService } from './schedule-section-facade.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { ScheduleDataService } from './schedule-data.service';
import { ScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

describe('ScheduleMenuDispatcherService - cover absence', () => {
  let service: ScheduleMenuDispatcherService;
  let openRecoveryDialog: ReturnType<typeof vi.fn>;
  let openReplacementDialog: ReturnType<typeof vi.fn>;
  const dataService = {} as ScheduleDataService;

  const buildHost = (entry: ScheduleCell | null): ScheduleMenuHost => ({
    contextMenuRow: 4,
    contextMenuColumn: 7,
    contextMenuEntry: entry,
    showSelectedShiftInShiftSection: vi.fn(),
    openContainerAt: vi.fn(),
    deleteBreakPlaceholder: vi.fn(),
    adoptBreakPlaceholder: vi.fn(),
  });

  beforeEach(() => {
    openRecoveryDialog = vi.fn();
    openReplacementDialog = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ScheduleMenuDispatcherService,
        { provide: BaseCellManipulationService, useValue: {} },
        {
          provide: ScheduleSectionFacadeService,
          useValue: { dialog: { openRecoveryDialog, openReplacementDialog }, entryActions: {} },
        },
      ],
    });

    service = TestBed.inject(ScheduleMenuDispatcherService);
  });

  it('routes the coverAbsence key to the recovery dialog with the clicked cell', () => {
    const entry = new ScheduleCell();
    entry.entryType = WorkScheduleEntryType.Work;
    const host = buildHost(entry);

    service.dispatch(['coverAbsence'], dataService, host);

    expect(openRecoveryDialog).toHaveBeenCalledWith(4, 7, dataService, entry);
    expect(openReplacementDialog).not.toHaveBeenCalled();
  });

  it('passes undefined instead of null when the cell entry was not pre-resolved', () => {
    service.dispatch(['coverAbsence'], dataService, buildHost(null));

    expect(openRecoveryDialog).toHaveBeenCalledWith(4, 7, dataService, undefined);
  });

  it('ignores an unknown key', () => {
    service.dispatch(['somethingElse'], dataService, buildHost(null));

    expect(openRecoveryDialog).not.toHaveBeenCalled();
  });
});
