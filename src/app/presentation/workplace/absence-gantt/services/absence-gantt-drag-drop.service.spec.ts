// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { CalendarSettingService } from './calendar-setting.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { DrawCalendarGanttService } from './draw-calendar-gantt.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { GanttCoordinateService } from './gantt-coordinate.service';
import { AbsenceGanttDragDropService } from './absence-gantt-drag-drop.service';

describe('AbsenceGanttDragDropService - cancelDrag', () => {
  let service: AbsenceGanttDragDropService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AbsenceGanttDragDropService,
        { provide: CalendarSettingService, useValue: {} },
        { provide: DataManagementBreakPlaceholderService, useValue: {} },
        { provide: DataManagementAbsenceGanttService, useValue: {} },
        { provide: DrawCalendarGanttService, useValue: {} },
        { provide: ScrollService, useValue: {} },
        { provide: GanttCoordinateService, useValue: {} },
      ],
    });
    service = TestBed.inject(AbsenceGanttDragDropService);
  });

  afterEach(() => {
    document.body.style.cursor = '';
  });

  it('clears cursor and all drag anchors', () => {
    const internals = service as any;
    document.body.style.cursor = CursorEnum.wResize;
    internals.mouseToBarAlpha = { x: 1, y: 2 };
    internals.originalBreakPosition = { startColumn: 1, endColumn: 2 };
    internals.dragStartMouseX = 10;

    service.cancelDrag();

    expect(document.body.style.cursor).toBe(CursorEnum.default);
    expect(internals.mouseToBarAlpha).toBeUndefined();
    expect(internals.originalBreakPosition).toBeUndefined();
    expect(internals.dragStartMouseX).toBeUndefined();
  });
});
