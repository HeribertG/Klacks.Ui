// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ScheduleDialogService } from './schedule-dialog.service';
import { ScheduleDataService } from './schedule-data.service';
import { RecoveryDialogLauncherService } from '../../services/recovery-dialog-launcher.service';
import { ScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

describe('ScheduleDialogService - openRecoveryDialog', () => {
  let service: ScheduleDialogService;
  let requestOpen: ReturnType<typeof vi.fn>;
  const cellDate = new Date(2026, 9, 6);

  // null stands for "the column has no date"; a default parameter cannot express an explicit undefined.
  const buildDataService = (entry: ScheduleCell | null, date: Date | null = cellDate): ScheduleDataService =>
    ({
      getWorkScheduleEntryForCell: vi.fn().mockReturnValue(entry),
      getDateForColumn: vi.fn().mockReturnValue(date ?? undefined),
    }) as unknown as ScheduleDataService;

  const workEntry = (clientId = 'client-1'): ScheduleCell => {
    const entry = new ScheduleCell();
    entry.entryType = WorkScheduleEntryType.Work;
    entry.clientId = clientId;
    return entry;
  };

  beforeEach(() => {
    requestOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [ScheduleDialogService, { provide: RecoveryDialogLauncherService, useValue: { requestOpen } }],
    });
    service = TestBed.inject(ScheduleDialogService);
  });

  it('requests the dialog with the employee and day of the pre-resolved work cell', () => {
    service.openRecoveryDialog(1, 2, buildDataService(null), workEntry());

    expect(requestOpen).toHaveBeenCalledWith({ clientId: 'client-1', date: cellDate });
  });

  it('resolves the cell itself when no entry was handed in', () => {
    service.openRecoveryDialog(1, 2, buildDataService(workEntry('client-2')));

    expect(requestOpen).toHaveBeenCalledWith({ clientId: 'client-2', date: cellDate });
  });

  it('does nothing for a break cell', () => {
    const entry = new ScheduleCell();
    entry.entryType = WorkScheduleEntryType.Break;
    entry.clientId = 'client-1';

    service.openRecoveryDialog(1, 2, buildDataService(null), entry);

    expect(requestOpen).not.toHaveBeenCalled();
  });

  it('does nothing when the column has no date', () => {
    service.openRecoveryDialog(1, 2, buildDataService(null, null), workEntry());

    expect(requestOpen).not.toHaveBeenCalled();
  });
});
