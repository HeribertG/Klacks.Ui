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
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { SelectedArea } from 'src/app/presentation/shared/grid/enums/breaks_enums';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

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

describe('AbsenceGanttDragDropService - break anchor hit area', () => {
  const ANCHOR_WIDTH = 10;
  const BAR = { left: 100, top: 20, right: 180, bottom: 60 };
  const BAR_CENTER_Y = (BAR.top + BAR.bottom) / 2;

  let service: AbsenceGanttDragDropService;
  let isTouchMode: boolean;
  let isPen: boolean;
  let drawCalendarGantt: any;

  const anchorAt = (left: number, right: number): Rectangle =>
    new Rectangle(
      left,
      BAR_CENTER_Y - ANCHOR_WIDTH / 2,
      right,
      BAR_CENTER_Y + ANCHOR_WIDTH / 2,
    );

  const at = (x: number, y: number): MouseEvent => {
    const event = new MouseEvent('mousedown');
    Object.defineProperty(event, 'offsetX', { value: x });
    Object.defineProperty(event, 'offsetY', { value: y });
    return event;
  };

  beforeEach(() => {
    isTouchMode = false;
    isPen = false;
    drawCalendarGantt = {
      selectedBreak: { entrySource: EntrySource.Placeholder },
      selectedBreakRec: new Rectangle(BAR.left, BAR.top, BAR.right, BAR.bottom),
      calcLeftAnchorRectangle: vi.fn(() => anchorAt(BAR.left - ANCHOR_WIDTH, BAR.left)),
      calcRightAnchorRectangle: vi.fn(() => anchorAt(BAR.right, BAR.right + ANCHOR_WIDTH)),
    };

    TestBed.configureTestingModule({
      providers: [
        AbsenceGanttDragDropService,
        { provide: CalendarSettingService, useValue: { anchorWidth: ANCHOR_WIDTH } },
        { provide: DataManagementBreakPlaceholderService, useValue: {} },
        { provide: DataManagementAbsenceGanttService, useValue: {} },
        { provide: DrawCalendarGanttService, useValue: drawCalendarGantt },
        { provide: ScrollService, useValue: {} },
        { provide: GanttCoordinateService, useValue: {} },
        { provide: InputModalityService, useValue: { isTouchMode: () => isTouchMode, isFingerMode: () => isTouchMode && !isPen } },
      ],
    });
    service = TestBed.inject(AbsenceGanttDragDropService);
  });

  it('keeps the drawn 10 px anchor as the only hit zone with a mouse', () => {
    service.existActiveSelection(at(BAR.left - 5, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.LeftAnchor);

    service.existActiveSelection(at(BAR.left - 15, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.None);

    service.existActiveSelection(at(BAR.left - 5, BAR_CENTER_Y + 10));
    expect(service.selectedArea).toBe(SelectedArea.None);
  });

  it('widens the left anchor hit zone outwards in touch mode', () => {
    isTouchMode = true;
    const outerEdge = BAR.left - TouchInteraction.BreakAnchorTouchHitAreaPx;

    service.existActiveSelection(at(outerEdge + 1, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.LeftAnchor);

    service.existActiveSelection(at(outerEdge - 1, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.None);
  });

  it('widens the right anchor hit zone outwards in touch mode', () => {
    isTouchMode = true;
    const outerEdge = BAR.right + TouchInteraction.BreakAnchorTouchHitAreaPx;

    service.existActiveSelection(at(outerEdge - 1, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.RightAnchor);

    service.existActiveSelection(at(outerEdge + 1, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.None);
  });

  it('gives the anchor the full touch height in touch mode', () => {
    isTouchMode = true;
    const halfHeight = TouchInteraction.BreakAnchorTouchHitAreaPx / 2;

    service.existActiveSelection(at(BAR.left - 5, BAR_CENTER_Y + halfHeight - 1));
    expect(service.selectedArea).toBe(SelectedArea.LeftAnchor);

    service.existActiveSelection(at(BAR.left - 5, BAR_CENTER_Y + halfHeight + 1));
    expect(service.selectedArea).toBe(SelectedArea.None);
  });

  it('never takes area away from the bar itself, because the bar is tested first', () => {
    isTouchMode = true;

    service.existActiveSelection(at(BAR.left, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.AbsenceBar);

    service.existActiveSelection(at(BAR.left + 1, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.AbsenceBar);
  });

  it('leaves the drawn anchor rectangle untouched, so only the hit zone grows', () => {
    isTouchMode = true;

    service.existActiveSelection(at(BAR.left - 20, BAR_CENTER_Y));

    const drawn = drawCalendarGantt.calcLeftAnchorRectangle.mock.results[0].value as Rectangle;
    expect(drawn.left).toBe(BAR.left - ANCHOR_WIDTH);
    expect(drawn.right).toBe(BAR.left);
    expect(drawn.width).toBe(ANCHOR_WIDTH);
    expect(drawn.height).toBe(ANCHOR_WIDTH);
  });

  it('keeps the drawn anchor as the only hit zone for a pen, which behaves like a mouse', () => {
    isTouchMode = true;
    isPen = true;

    service.existActiveSelection(at(BAR.left - 20, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.None);

    service.existActiveSelection(at(BAR.left - 5, BAR_CENTER_Y));
    expect(service.selectedArea).toBe(SelectedArea.LeftAnchor);
  });

  it('reports only the anchors, not the bar, as the resize grip that suppresses a long press', () => {
    isTouchMode = true;

    expect(service.isMouseOverBreakAnchor(at(BAR.left - 20, BAR_CENTER_Y))).toBe(true);
    expect(service.isMouseOverBreakAnchor(at(BAR.right + 20, BAR_CENTER_Y))).toBe(true);
    expect(service.isMouseOverBreakAnchor(at(BAR.left + 20, BAR_CENTER_Y))).toBe(false);
    expect(service.isMouseOverBreakAnchor(at(BAR.left - 60, BAR_CENTER_Y))).toBe(false);
  });

  it('reports an anchor as draggable content for the touch gesture predicate', () => {
    isTouchMode = true;
    const onAnchor = at(BAR.left - 20, BAR_CENTER_Y);

    expect(service.isMouseOverSelectedBreakOrAnchor(onAnchor)).toBe(true);
    expect(service.isMouseOverSelectedBreak(onAnchor)).toBe(false);
  });

  it('reports the bar itself as draggable content as well', () => {
    isTouchMode = true;
    const onBar = at(BAR.left + 20, BAR_CENTER_Y);

    expect(service.isMouseOverSelectedBreakOrAnchor(onBar)).toBe(true);
  });

  it('keeps schedule-sourced breaks non-resizable in touch mode', () => {
    isTouchMode = true;
    drawCalendarGantt.selectedBreak = { entrySource: EntrySource.Schedule };

    expect(service.isMouseOverSelectedBreakOrAnchor(at(BAR.left - 20, BAR_CENTER_Y))).toBe(false);
    expect(service.selectedArea).toBe(SelectedArea.None);
  });
});
