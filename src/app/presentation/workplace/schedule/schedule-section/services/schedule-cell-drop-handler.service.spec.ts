// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { ScheduleCellDropHandlerService } from './schedule-cell-drop-handler.service';
import {
  ScheduleCellDragSource,
  ScheduleCellDropResult,
} from './schedule-cell-drag-drop.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

const SOURCE_DATE = new Date(2026, 4, 11);

let workSource: ScheduleCellDragSource;
let breakSource: ScheduleCellDragSource;

const buildSources = (settings: BaseSettingsService): void => {
  workSource = {
    row: 2,
    column: 5,
    clientId: 'client-source',
    date: SOURCE_DATE,
    id: 'entry-id',
    sourceId: 'work-source-id',
    entryId: 'shift-id',
    entryType: WorkScheduleEntryType.Work,
    abbreviation: 'F',
    startTime: '06:00:00',
    endTime: '14:00:00',
    startX: 100,
    startY: 200,
    cellWidth: settings.cellWidth,
    cellHeight: settings.cellHeight,
    snapshotDataUrl: null,
  };
  breakSource = {
    ...workSource,
    id: 'break-entry-id',
    sourceId: 'break-source-id',
    entryId: 'absence-id',
    entryType: WorkScheduleEntryType.Break,
    abbreviation: 'V',
    startTime: '00:00:00',
    endTime: '23:59:00',
  };
};

const visibleStart = new Date(2026, 4, 1);
const visibleEnd = new Date(2026, 4, 31);

describe('ScheduleCellDropHandlerService', () => {
  let service: ScheduleCellDropHandlerService;
  let dataManagement: {
    deleteWorkScheduleEntry: ReturnType<typeof vi.fn>;
    addWorkScheduleEntry: ReturnType<typeof vi.fn>;
    reassignWorkScheduleEntry: ReturnType<typeof vi.fn>;
    visibleStartDate: Date | null;
    visibleEndDate: Date | null;
    currentFilter: { paymentInterval: number };
  };
  let scheduleEntryCrud: { addBreakScheduleEntry: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dataManagement = {
      deleteWorkScheduleEntry: vi.fn(),
      addWorkScheduleEntry: vi.fn().mockResolvedValue(undefined),
      reassignWorkScheduleEntry: vi.fn().mockResolvedValue(undefined),
      visibleStartDate: visibleStart,
      visibleEndDate: visibleEnd,
      currentFilter: { paymentInterval: 2 },
    };

    scheduleEntryCrud = {
      addBreakScheduleEntry: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        // AnalyseScenarioService listens for background-optimiser candidates on connect.
        { provide: SCHEDULE_SIGNALR, useValue: { wizard4CandidatesChanged$: new Subject<never>() } },
        ScheduleCellDropHandlerService,
        BaseSettingsService,
        { provide: DataManagementScheduleService, useValue: dataManagement },
        { provide: ScheduleEntryCrudService, useValue: scheduleEntryCrud },
        {
          provide: TranslateService,
          useValue: {
            currentLang: 'de',
            instant: vi.fn().mockReturnValue(''),
            get: vi.fn().mockReturnValue(of('')),
            onTranslationChange: of(),
            onLangChange: of(),
            onDefaultLangChange: of(),
          },
        },
      ],
    });

    buildSources(TestBed.inject(BaseSettingsService));
    service = TestBed.inject(ScheduleCellDropHandlerService);
  });

  it('delete action calls deleteWorkScheduleEntry with all source fields', () => {
    const result: ScheduleCellDropResult = { source: workSource, action: 'delete' };

    service.handleDrop(result);

    expect(dataManagement.deleteWorkScheduleEntry).toHaveBeenCalledWith(
      workSource.id,
      workSource.sourceId,
      workSource.clientId,
      workSource.date,
      workSource.entryId,
      workSource.entryType,
    );
  });

  it('cancel action is a no-op', () => {
    service.handleDrop({ source: workSource, action: 'cancel' });

    expect(dataManagement.deleteWorkScheduleEntry).not.toHaveBeenCalled();
    expect(dataManagement.addWorkScheduleEntry).not.toHaveBeenCalled();
    expect(scheduleEntryCrud.addBreakScheduleEntry).not.toHaveBeenCalled();
  });

  it('move Work reassigns the existing entry to the target client in place', async () => {
    const result: ScheduleCellDropResult = {
      source: workSource,
      action: 'move',
      targetRow: 9,
      targetClientId: 'client-target',
    };

    service.handleDrop(result);
    await Promise.resolve();
    await Promise.resolve();

    expect(dataManagement.reassignWorkScheduleEntry).toHaveBeenCalledWith(
      workSource.sourceId,
      workSource.clientId,
      'client-target',
      SOURCE_DATE,
    );
    expect(dataManagement.addWorkScheduleEntry).not.toHaveBeenCalled();
    expect(dataManagement.deleteWorkScheduleEntry).not.toHaveBeenCalled();
  });

  it('move Work without targetClientId is a no-op', () => {
    service.handleDrop({ source: workSource, action: 'move' });

    expect(dataManagement.reassignWorkScheduleEntry).not.toHaveBeenCalled();
  });

  it('move Work shows an error toast if reassign rejects', async () => {
    dataManagement.reassignWorkScheduleEntry.mockRejectedValueOnce(new Error('reassign failed'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.handleDrop({ source: workSource, action: 'move', targetClientId: 'client-target' });
    await Promise.resolve();
    await Promise.resolve();

    expect(dataManagement.deleteWorkScheduleEntry).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('move Break calls addBreakScheduleEntry on target client first, then delete on source', async () => {
    service.handleDrop({
      source: breakSource,
      action: 'move',
      targetClientId: 'client-target',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(scheduleEntryCrud.addBreakScheduleEntry).toHaveBeenCalledTimes(1);
    const arg = scheduleEntryCrud.addBreakScheduleEntry.mock.calls[0][0];
    expect(arg.clientId).toBe('client-target');
    expect(arg.absenceId).toBe('absence-id');
    expect(arg.currentDate).toBe(SOURCE_DATE);
    expect(arg.startTime).toBe('00:00:00');
    expect(arg.endTime).toBe('23:59:00');
    expect(arg.paymentInterval).toBe(2);

    expect(dataManagement.deleteWorkScheduleEntry).toHaveBeenCalledWith(
      breakSource.id,
      breakSource.sourceId,
      breakSource.clientId,
      breakSource.date,
      breakSource.entryId,
      breakSource.entryType,
    );
  });

  it('move Break skips delete if add rejects', async () => {
    scheduleEntryCrud.addBreakScheduleEntry.mockRejectedValueOnce(new Error('break add failed'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service.handleDrop({ source: breakSource, action: 'move', targetClientId: 'client-target' });
    await Promise.resolve();
    await Promise.resolve();

    expect(dataManagement.deleteWorkScheduleEntry).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
