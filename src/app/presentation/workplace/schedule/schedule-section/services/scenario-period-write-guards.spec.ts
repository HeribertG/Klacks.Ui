// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { DataManagementScheduleNoteService } from 'src/app/domain/services/schedule-note/data-management-schedule-note.service';
import { DataManagementScheduleCommandService } from 'src/app/domain/services/schedule-command/data-management-schedule-command.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { GridSurfaceTemplateComponent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { GridScheduleEventsService } from '../../services/grid-schedule-events.service';
import { ShiftToScheduleDragDropService } from '../../services/shift-to-schedule-drag-drop.service';
import { ScheduleSectionComponent } from '../schedule-section.component';
import { ScheduleCellDragDropService } from './schedule-cell-drag-drop.service';
import { ScheduleDataService } from './schedule-data.service';
import { ScheduleDragDropService } from './schedule-drag-drop.service';
import { ScheduleEntryActionsService } from './schedule-entry-actions.service';
import { ShiftPlacementService } from './shift-placement.service';

const COLUMN = 2;
const POSITION = { row: 0, column: COLUMN };

describe('write paths on a day outside the active scenario', () => {
  const buildEntry = (entryType = WorkScheduleEntryType.Work) => ({
    id: 'work-1',
    sourceId: 'work-1',
    clientId: 'client-1',
    entryId: 'shift-1',
    entryType,
    lockLevel: 0,
    isGroupRestricted: false,
  });

  describe('grid mouse and keyboard', () => {
    let isOutsideScenario: boolean;
    let tryPrepareDrag: ReturnType<typeof vi.fn>;
    let deleteEntry: ReturnType<typeof vi.fn>;
    let events: GridScheduleEventsService;

    beforeEach(() => {
      isOutsideScenario = false;
      tryPrepareDrag = vi.fn();
      deleteEntry = vi.fn();

      TestBed.configureTestingModule({
        providers: [
          GridScheduleEventsService,
          {
            provide: BaseDataService,
            useValue: {
              isColumnSealed: () => false,
              isColumnOutsideScenario: () => isOutsideScenario,
              getWorkScheduleEntryForCell: () => buildEntry(),
              getDateForColumn: () => new Date(2026, 10, 30),
            },
          },
          {
            provide: GridSurfaceTemplateComponent,
            useValue: {
              nameId: () => 'surface',
              canvasRef: () => undefined,
              drawSchedule: {
                position: POSITION,
                calcCorrectCoordinate: () => POSITION,
                isPositionValid: () => true,
              },
            },
          },
          { provide: BaseSettingsService, useValue: { cellWidth: 10, cellHeight: 10 } },
          {
            provide: BaseCellManipulationService,
            useValue: { PositionCollection: { count: () => 0, contains: () => false } },
          },
          { provide: ScrollService, useValue: {} },
          { provide: ShiftToScheduleDragDropService, useValue: {} },
          { provide: ScheduleCellDragDropService, useValue: { tryPrepareDrag } },
          { provide: DataManagementScheduleService, useValue: { deleteWorkScheduleEntry: deleteEntry } },
        ],
      });

      events = TestBed.inject(GridScheduleEventsService);
    });

    it('starts no cell drag', () => {
      isOutsideScenario = true;

      events.tryPrepareScheduleCellDrag(new MouseEvent('mousedown'));

      expect(tryPrepareDrag).not.toHaveBeenCalled();
    });

    it('starts the cell drag inside the scenario', () => {
      events.tryPrepareScheduleCellDrag(new MouseEvent('mousedown'));

      expect(tryPrepareDrag).toHaveBeenCalledTimes(1);
    });

    it('ignores the delete key', () => {
      isOutsideScenario = true;

      events.handleDeleteKey();

      expect(deleteEntry).not.toHaveBeenCalled();
    });

    it('deletes with the delete key inside the scenario', () => {
      events.handleDeleteKey();

      expect(deleteEntry).toHaveBeenCalledTimes(1);
    });
  });

  describe('typed cell value', () => {
    let isOutsideScenario: boolean;
    let createNote: ReturnType<typeof vi.fn>;
    let dragDrop: ScheduleDragDropService;

    const typeInCell = (): void =>
      dragDrop.handleCellValueChange(
        { row: 0, column: COLUMN, value: 'Note text' } as never,
        {
          isColumnOutsideScenario: () => isOutsideScenario,
          rowGroupIndex: [0],
          getDateForColumn: () => new Date(2026, 10, 30),
          getWorkScheduleEntryForCell: () => undefined,
        } as unknown as ScheduleDataService,
      );

    beforeEach(() => {
      isOutsideScenario = false;
      createNote = vi.fn().mockReturnValue(of({}));

      TestBed.configureTestingModule({
        providers: [
          ScheduleDragDropService,
          { provide: DataManagementScheduleService, useValue: { clients: [{ id: 'client-1' }], shiftSchedules: [], readDatas: vi.fn() } },
          { provide: DataManagementScheduleNoteService, useValue: { create: createNote } },
          { provide: DataManagementScheduleCommandService, useValue: {} },
          { provide: AbsenceLookupService, useValue: { absences: () => [], absenceDetails: () => [] } },
          {
            provide: AppSettingsManagementService,
            useValue: {
              schedulingDefaultSettings: () => ({
                commandKeywordFree: 'FREE',
                commandKeywordEarly: 'EARLY',
                commandKeywordLate: 'LATE',
                commandKeywordNight: 'NIGHT',
                commandKeywordNegFree: '-FREE',
                commandKeywordNegEarly: '-EARLY',
                commandKeywordNegLate: '-LATE',
                commandKeywordNegNight: '-NIGHT',
              }),
            },
          },
          { provide: ScheduleEntryActionsService, useValue: {} },
          { provide: ShiftPlacementService, useValue: {} },
          { provide: TranslateService, useValue: { currentLang: 'de' } },
          { provide: ScrollService, useValue: {} },
          { provide: BaseSettingsService, useValue: {} },
          { provide: AnalyseScenarioService, useValue: { activeToken: () => 'token-1' } },
        ],
      });

      dragDrop = TestBed.inject(ScheduleDragDropService);
    });

    it('writes no note, command, shift or absence', () => {
      isOutsideScenario = true;

      typeInCell();

      expect(createNote).not.toHaveBeenCalled();
    });

    it('writes the note inside the scenario', () => {
      typeInCell();

      expect(createNote).toHaveBeenCalledTimes(1);
    });
  });

  describe('double click and timeline block delete, which also serve the timeline surface', () => {
    const buildHost = (isOutsideScenario: boolean) => ({
      scheduleService: {
        isColumnOutsideScenario: () => isOutsideScenario,
        getDateForColumn: () => new Date(2026, 10, 30),
      },
      facade: {
        dialog: {
          editWorkChange: vi.fn(),
          openWorkEditDialog: vi.fn(),
          openContainerWorkEditDialog: vi.fn(),
        },
      },
      dataManagement: { shiftSchedules: [], deleteWorkScheduleEntry: vi.fn() },
      timelineSelection: { clearBlock: vi.fn() },
      cellManipulation: { clearPosition: vi.fn() },
      mapShiftsToAvailable: () => [],
    });

    const callOn = (host: ReturnType<typeof buildHost>, handler: keyof ScheduleSectionComponent): void => {
      const method = ScheduleSectionComponent.prototype[handler] as (event: unknown) => void;
      method.call(host, { row: 0, column: COLUMN, entry: buildEntry() });
    };

    it.each<[keyof ScheduleSectionComponent, 'editWorkChange' | 'openWorkEditDialog' | 'openContainerWorkEditDialog']>([
      ['onWorkChangeDoubleClick', 'editWorkChange'],
      ['onWorkDoubleClick', 'openWorkEditDialog'],
      ['onContainerWorkDoubleClick', 'openContainerWorkEditDialog'],
    ])('%s opens %s only inside the scenario', (handler, dialog) => {
      const outside = buildHost(true);
      const inside = buildHost(false);

      callOn(outside, handler);
      callOn(inside, handler);

      expect(outside.facade.dialog[dialog]).not.toHaveBeenCalled();
      expect(inside.facade.dialog[dialog]).toHaveBeenCalledTimes(1);
    });

    it('deletes a timeline block only inside the scenario', () => {
      const outside = buildHost(true);
      const inside = buildHost(false);

      callOn(outside, 'onTimelineDeleteBlock');
      callOn(inside, 'onTimelineDeleteBlock');

      expect(outside.dataManagement.deleteWorkScheduleEntry).not.toHaveBeenCalled();
      expect(inside.dataManagement.deleteWorkScheduleEntry).toHaveBeenCalledTimes(1);
    });
  });
});
