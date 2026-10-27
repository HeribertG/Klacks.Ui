// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { TimeRulerDragDropService } from './time-ruler-drag-drop.service';
import { TimeRulerBlockSelectionService } from './time-ruler-block-selection.service';
import { ItemPosition } from './item-position.interface';

const PIXELS_PER_MINUTE = 2;
const SNAP_MINUTES = 1;
const DISPLAY_FROM = 420;
const TOTAL_MINUTES = 720;
const CANVAS_HEIGHT = 1440;
const SHIFT_RECT = new Rectangle(15, 100, 185, 220);
const MOUSE_START = 500;

interface ItemTimes {
  briefing?: string;
  debriefing?: string;
  travelBefore?: string;
  travelAfter?: string;
}

function timeRangeItem(start: string, end: string, times: ItemTimes = {}): IContainerTemplateItem {
  return {
    shiftId: 'shift-1',
    shift: { isTimeRange: true } as IShift,
    startItem: start,
    endItem: end,
    timeRangeStartItem: start,
    timeRangeEndItem: end,
    briefingTime: times.briefing ?? '',
    debriefingTime: times.debriefing ?? '',
    travelTimeBefore: times.travelBefore ?? '',
    travelTimeAfter: times.travelAfter ?? '',
  };
}

function sporadicItem(start: string, end: string): IContainerTemplateItem {
  return {
    shiftId: 'shift-1',
    shift: { isSporadic: true } as IShift,
    startItem: start,
    endItem: end,
    timeRangeStartItem: null,
    timeRangeEndItem: null,
    briefingTime: '',
    debriefingTime: '',
    travelTimeBefore: '',
    travelTimeAfter: '',
  };
}

function absenceItem(start: string | undefined, end: string | undefined): IContainerTemplateItem {
  return {
    shiftId: undefined,
    absenceId: 'absence-1',
    startItem: start,
    endItem: end,
    timeRangeStartItem: null,
    timeRangeEndItem: null,
    briefingTime: '',
    debriefingTime: '',
    travelTimeBefore: '',
    travelTimeAfter: '',
  };
}

function fixedItem(start: string, end: string): IContainerTemplateItem {
  return {
    shiftId: 'shift-1',
    shift: { isTimeRange: false } as IShift,
    startItem: start,
    endItem: end,
    timeRangeStartItem: null,
    timeRangeEndItem: null,
    briefingTime: '',
    debriefingTime: '',
    travelTimeBefore: '',
    travelTimeAfter: '',
  };
}

function positions(map: Map<IContainerTemplateItem, ItemPosition>, items: Record<string, IContainerTemplateItem>):
  Record<string, ItemPosition> {
  const result: Record<string, ItemPosition> = {};
  for (const [name, item] of Object.entries(items)) {
    const pos = map.get(item);
    if (pos) {
      result[name] = pos;
    }
  }
  return result;
}

describe('TimeRulerDragDropService - characterization', () => {
  let service: TimeRulerDragDropService;

  const mouseFor = (minutes: number): number => MOUSE_START + minutes * PIXELS_PER_MINUTE;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TimeRulerDragDropService, TimeRulerBlockSelectionService],
    });
    service = TestBed.inject(TimeRulerDragDropService);
    service.initializeDragState(PIXELS_PER_MINUTE, SNAP_MINUTES, DISPLAY_FROM, TOTAL_MINUTES);
  });

  describe('initializeDragState', () => {
    it('stores the scale and the display window', () => {
      service.initializeDragState(3, 15, 100, 600);

      expect(service.dragState.pixelsPerMinute).toBe(3);
      expect(service.dragState.snapToMinutes).toBe(15);
      expect(service.dragState.displayFromMinutes).toBe(100);
      expect(service.dragState.totalMinutes).toBe(600);
      expect(service.dragState.isDragging).toBe(false);
    });
  });

  describe('startDrag', () => {
    it('refuses a fixed-time shift that is no time range', () => {
      const item = fixedItem('08:00', '09:00');

      expect(service.startDrag(MOUSE_START, item, SHIFT_RECT, [item])).toBe(false);
      expect(service.dragState.isDragging).toBe(false);
    });

    it('refuses an absence without start or end', () => {
      const item = absenceItem('08:00', undefined);

      expect(service.startDrag(MOUSE_START, item, SHIFT_RECT, [item])).toBe(false);
      expect(service.dragState.isDragging).toBe(false);
    });

    it('refuses a time range whose times cannot be parsed', () => {
      const item = timeRangeItem('xx', '09:00');

      expect(service.startDrag(MOUSE_START, item, SHIFT_RECT, [item])).toBe(false);
      expect(service.dragState.isDragging).toBe(false);
    });

    it('starts on an absence with explicit times', () => {
      const item = absenceItem('08:00', '09:30');

      expect(service.startDrag(MOUSE_START, item, SHIFT_RECT, [item])).toBe(true);
      expect(service.dragState.originalStartMinutes).toBe(480);
      expect(service.dragState.originalEndMinutes).toBe(570);
    });

    it('records the dragged item and the original position of every item', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('22:00', '02:00');
      const c = sporadicItem('10:00', '10:30');

      expect(service.startDrag(MOUSE_START, a, SHIFT_RECT, [a, b, c])).toBe(true);

      const state = service.dragState;
      expect(state.isDragging).toBe(true);
      expect(state.draggedShift).toBe(a);
      expect(state.draggedShiftRect).toBe(SHIFT_RECT);
      expect(state.dragStartMouseY).toBe(MOUSE_START);
      expect(state.originalStartMinutes).toBe(480);
      expect(state.originalEndMinutes).toBe(540);
      expect(state.isBlockDrag).toBe(false);
      expect(positions(state.originalPositions, { a, b, c })).toEqual({
        a: { startMinutes: 480, endMinutes: 540 },
        b: { startMinutes: 1320, endMinutes: 1560 },
        c: { startMinutes: 600, endMinutes: 630 },
      });
    });
  });

  describe('updateDrag - single item', () => {
    it('returns null while no drag is running', () => {
      const a = timeRangeItem('08:00', '09:00');

      expect(service.updateDrag(mouseFor(30), [a])).toBeNull();
    });

    it('rounds the mouse delta to the snap grid', () => {
      const a = timeRangeItem('08:00', '09:00');
      service.initializeDragState(PIXELS_PER_MINUTE, 15, DISPLAY_FROM, TOTAL_MINUTES);
      service.startDrag(MOUSE_START, a, SHIFT_RECT, [a]);

      expect(service.updateDrag(mouseFor(8), [a])?.draggedPosition).toEqual({ newStartMinutes: 495, newEndMinutes: 555 });
      expect(service.updateDrag(mouseFor(7), [a])?.draggedPosition).toEqual({ newStartMinutes: 480, newEndMinutes: 540 });
      expect(service.updateDrag(mouseFor(-23), [a])?.draggedPosition).toEqual({ newStartMinutes: 450, newEndMinutes: 510 });
    });

    it('clamps the dragged item into the display window', () => {
      const a = timeRangeItem('08:00', '09:00');
      service.startDrag(MOUSE_START, a, SHIFT_RECT, [a]);

      expect(service.updateDrag(mouseFor(-500), [a])?.draggedPosition).toEqual({ newStartMinutes: 420, newEndMinutes: 480 });
      expect(service.updateDrag(mouseFor(900), [a])?.draggedPosition).toEqual({ newStartMinutes: 1080, newEndMinutes: 1140 });
    });

    it('pushes the following items down in start order until the first gap', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const c = timeRangeItem('10:15', '10:45');
      const d = timeRangeItem('12:00', '13:00');
      const all = [d, c, b, a];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(30), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 510, newEndMinutes: 570 });
      expect(positions(result!.displacements, { a, b, c, d })).toEqual({
        b: { startMinutes: 570, endMinutes: 630 },
        c: { startMinutes: 630, endMinutes: 660 },
      });
    });

    it('pushes the preceding items up in reverse start order until the first gap', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const c = timeRangeItem('10:15', '10:45');
      const d = timeRangeItem('12:00', '13:00');
      const all = [a, b, c, d];
      service.startDrag(MOUSE_START, c, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(-20), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 595, newEndMinutes: 625 });
      expect(positions(result!.displacements, { a, b, c, d })).toEqual({
        b: { startMinutes: 535, endMinutes: 595 },
        a: { startMinutes: 475, endMinutes: 535 },
      });
    });

    it('pushes in start order, so a later item with a long lead time stays when the first item is not hit', () => {
      const a = timeRangeItem('08:00', '09:00');
      const near = timeRangeItem('09:55', '10:30');
      const longLead = timeRangeItem('10:00', '11:00', { travelBefore: '00:45' });
      const all = [a, longLead, near];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(50), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 530, newEndMinutes: 590 });
      expect(result?.displacements.size).toBe(0);
    });

    it('pushes in start order, not in array order', () => {
      const a = timeRangeItem('08:00', '09:00');
      const second = timeRangeItem('10:00', '10:30');
      const first = timeRangeItem('09:40', '09:50');
      const all = [a, second, first];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(45), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 525, newEndMinutes: 585 });
      expect(positions(result!.displacements, { first, second })).toEqual({
        first: { startMinutes: 585, endMinutes: 595 },
      });
    });

    it('ignores items whose midpoint lies before the dragged start when moving down', () => {
      const a = timeRangeItem('08:00', '09:00');
      const before = timeRangeItem('07:00', '08:20');
      const all = [a, before];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(10), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 490, newEndMinutes: 550 });
      expect(result?.displacements.size).toBe(0);
    });

    it('displaces sporadic shifts and absences but never fixed shifts', () => {
      const a = timeRangeItem('08:00', '09:00');
      const sporadic = sporadicItem('09:00', '09:30');
      const absence = absenceItem('09:30', '10:00');
      const fixed = fixedItem('10:00', '11:00');
      const all = [a, sporadic, absence, fixed];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(40), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 520, newEndMinutes: 580 });
      expect(positions(result!.displacements, { sporadic, absence, fixed })).toEqual({
        sporadic: { startMinutes: 580, endMinutes: 610 },
        absence: { startMinutes: 610, endMinutes: 640 },
      });
    });

    it('keeps briefing, debriefing and travel times between pushed items', () => {
      const a = timeRangeItem('08:00', '09:00', { debriefing: '00:05', travelAfter: '00:05' });
      const b = timeRangeItem('09:30', '10:00', { travelBefore: '00:10', briefing: '00:05', debriefing: '00:10' });
      const c = timeRangeItem('10:20', '11:00', { briefing: '00:05' });
      const all = [a, b, c];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(20), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 500, newEndMinutes: 560 });
      expect(positions(result!.displacements, { b, c })).toEqual({
        b: { startMinutes: 585, endMinutes: 615 },
        c: { startMinutes: 630, endMinutes: 670 },
      });
    });

    it('computes displacement from the original positions, not from the current item fields', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const all = [a, b];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);
      b.timeRangeStartItem = '15:00';
      b.timeRangeEndItem = '16:00';

      const result = service.updateDrag(mouseFor(30), all);

      expect(positions(result!.displacements, { b })).toEqual({ b: { startMinutes: 570, endMinutes: 630 } });
    });

    it('snaps the dragged end onto the start of the next item within the pixel threshold', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const all = [a, b];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(2), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 480, newEndMinutes: 540 });
      expect(result?.displacements.size).toBe(0);
    });

    it('does not snap when the distance exceeds the pixel threshold', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const all = [a, b];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(3), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 483, newEndMinutes: 543 });
      expect(positions(result!.displacements, { b })).toEqual({ b: { startMinutes: 543, endMinutes: 603 } });
    });

    it('snaps the dragged start onto the end of the previous item', () => {
      const b = timeRangeItem('09:00', '10:00');
      const c = timeRangeItem('10:15', '10:45');
      const all = [b, c];
      service.startDrag(MOUSE_START, c, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(-17), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 600, newEndMinutes: 630 });
      expect(result?.displacements.size).toBe(0);
    });

    it('snaps with the effective edges including briefing and travel times', () => {
      const a = timeRangeItem('08:00', '09:00', { debriefing: '00:10' });
      const b = timeRangeItem('09:30', '10:00', { travelBefore: '00:15' });
      const all = [a, b];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(7), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 485, newEndMinutes: 545 });
      expect(result?.displacements.size).toBe(0);
    });

    it('does not snap onto sporadic shifts', () => {
      const a = timeRangeItem('08:00', '09:00');
      const sporadic = sporadicItem('09:00', '10:00');
      const all = [a, sporadic];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);

      const result = service.updateDrag(mouseFor(2), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 482, newEndMinutes: 542 });
      expect(positions(result!.displacements, { sporadic })).toEqual({
        sporadic: { startMinutes: 542, endMinutes: 602 },
      });
    });

    it('snaps against the original position of the neighbour', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const all = [a, b];
      service.startDrag(MOUSE_START, a, SHIFT_RECT, all);
      b.timeRangeStartItem = '09:02';
      b.timeRangeEndItem = '10:02';

      const result = service.updateDrag(mouseFor(2), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 480, newEndMinutes: 540 });
    });
  });

  describe('updateDrag - block', () => {
    let blockSelection: TimeRulerBlockSelectionService;

    beforeEach(() => {
      blockSelection = TestBed.inject(TimeRulerBlockSelectionService);
    });

    it('refuses a block drag when the anchor cannot be dragged', () => {
      const anchor = absenceItem(undefined, '09:00');
      blockSelection.selectedItems.set(new Set([anchor]));

      expect(service.startBlockDrag(MOUSE_START, anchor, SHIFT_RECT, [anchor], blockSelection)).toBe(false);
      expect(service.dragState.isBlockDrag).toBe(false);
      expect(service.dragState.isDragging).toBe(false);
    });

    it('records the block items, their positions and the effective block bounds', () => {
      const a = timeRangeItem('08:00', '09:00', { briefing: '00:10' });
      const b = timeRangeItem('09:00', '10:00', { travelAfter: '00:20' });
      const c = timeRangeItem('10:15', '10:45');
      const all = [a, b, c];
      blockSelection.selectedItems.set(new Set([a, b]));

      expect(service.startBlockDrag(MOUSE_START, a, SHIFT_RECT, all, blockSelection)).toBe(true);

      const state = service.dragState;
      expect(state.isDragging).toBe(true);
      expect(state.isBlockDrag).toBe(true);
      expect([...state.blockItems]).toEqual([a, b]);
      expect(state.blockEffectiveStart).toBe(470);
      expect(state.blockEffectiveEnd).toBe(620);
      expect(positions(state.blockOriginalPositions, { a, b, c })).toEqual({
        a: { startMinutes: 480, endMinutes: 540 },
        b: { startMinutes: 540, endMinutes: 600 },
      });
    });

    it('moves all block items by the anchor delta and pushes the following items down', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const c = timeRangeItem('10:15', '10:45');
      const d = timeRangeItem('12:00', '13:00');
      const all = [a, b, c, d];
      blockSelection.selectedItems.set(new Set([a, b]));
      service.startBlockDrag(MOUSE_START, a, SHIFT_RECT, all, blockSelection);

      const result = service.updateDrag(mouseFor(20), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 500, newEndMinutes: 560 });
      expect(positions(result!.displacements, { a, b, c, d })).toEqual({
        b: { startMinutes: 560, endMinutes: 620 },
        c: { startMinutes: 620, endMinutes: 650 },
      });
    });

    it('pushes the preceding items up when the block moves up', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const c = timeRangeItem('10:15', '10:45');
      const d = timeRangeItem('12:00', '13:00');
      const all = [a, b, c, d];
      blockSelection.selectedItems.set(new Set([b, c]));
      service.startBlockDrag(MOUSE_START, b, SHIFT_RECT, all, blockSelection);

      const result = service.updateDrag(mouseFor(-10), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 530, newEndMinutes: 590 });
      expect(positions(result!.displacements, { a, b, c, d })).toEqual({
        c: { startMinutes: 605, endMinutes: 635 },
        a: { startMinutes: 470, endMinutes: 530 },
      });
    });

    it('never snaps to edges in block mode', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const c = timeRangeItem('10:00', '11:00');
      const all = [a, b, c];
      blockSelection.selectedItems.set(new Set([a]));
      service.startBlockDrag(MOUSE_START, a, SHIFT_RECT, all, blockSelection);

      const result = service.updateDrag(mouseFor(2), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 482, newEndMinutes: 542 });
      expect(positions(result!.displacements, { b, c })).toEqual({
        b: { startMinutes: 542, endMinutes: 602 },
        c: { startMinutes: 602, endMinutes: 662 },
      });
    });

    it('ignores items whose midpoint lies after the block end when moving up', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      const after = timeRangeItem('09:50', '11:00');
      const all = [a, b, after];
      blockSelection.selectedItems.set(new Set([a, b]));
      service.startBlockDrag(MOUSE_START, b, SHIFT_RECT, all, blockSelection);

      const result = service.updateDrag(mouseFor(-30), all);

      expect(result?.draggedPosition).toEqual({ newStartMinutes: 510, newEndMinutes: 570 });
      expect(positions(result!.displacements, { a, after })).toEqual({
        a: { startMinutes: 450, endMinutes: 510 },
      });
    });
  });

  describe('endDrag / cancelDrag', () => {
    it('returns null when no drag is running', () => {
      expect(service.endDrag()).toBeNull();
    });

    it('returns the current time-range strings of the dragged shift and resets the state', () => {
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      service.startDrag(MOUSE_START, a, SHIFT_RECT, [a, b]);
      a.timeRangeStartItem = '08:30';
      a.timeRangeEndItem = '09:30';

      expect(service.endDrag()).toEqual({ shift: a, newStartTime: '08:30', newEndTime: '09:30' });

      const state = service.dragState;
      expect(state.isDragging).toBe(false);
      expect(state.draggedShift).toBeNull();
      expect(state.draggedShiftRect).toBeNull();
      expect(state.dragStartMouseY).toBeUndefined();
      expect(state.originalStartMinutes).toBeUndefined();
      expect(state.originalEndMinutes).toBeUndefined();
      expect(state.originalPositions.size).toBe(0);
      expect(state.pixelsPerMinute).toBe(PIXELS_PER_MINUTE);
      expect(state.displayFromMinutes).toBe(DISPLAY_FROM);
    });

    it('returns the start and end item of a dragged absence', () => {
      const absence = absenceItem('08:00', '09:00');
      service.startDrag(MOUSE_START, absence, SHIFT_RECT, [absence]);
      absence.startItem = '07:00';
      absence.endItem = '08:00';

      expect(service.endDrag()).toEqual({ shift: absence, newStartTime: '07:00', newEndTime: '08:00' });
    });

    it('returns null when the dragged shift lost its time strings', () => {
      const a = timeRangeItem('08:00', '09:00');
      service.startDrag(MOUSE_START, a, SHIFT_RECT, [a]);
      a.timeRangeEndItem = null;

      expect(service.endDrag()).toBeNull();
      expect(service.dragState.isDragging).toBe(false);
    });

    it('clears the block state on end and on cancel', () => {
      const blockSelection = TestBed.inject(TimeRulerBlockSelectionService);
      const a = timeRangeItem('08:00', '09:00');
      const b = timeRangeItem('09:00', '10:00');
      blockSelection.selectedItems.set(new Set([a, b]));
      service.startBlockDrag(MOUSE_START, a, SHIFT_RECT, [a, b], blockSelection);

      service.cancelDrag();

      const state = service.dragState;
      expect(state.isDragging).toBe(false);
      expect(state.isBlockDrag).toBe(false);
      expect(state.blockItems.size).toBe(0);
      expect(state.blockOriginalPositions.size).toBe(0);
      expect(state.blockEffectiveStart).toBe(0);
      expect(state.blockEffectiveEnd).toBe(0);
      expect(service.updateDrag(mouseFor(10), [a, b])).toBeNull();
    });
  });

  describe('calculateNewPosition / formatTimeFromMinutes', () => {
    it('returns null before a drag started', () => {
      expect(service.calculateNewPosition(510, 570, CANVAS_HEIGHT)).toBeNull();
    });

    it('maps minutes to canvas rows and keeps the horizontal bounds of the dragged rectangle', () => {
      const a = timeRangeItem('08:00', '09:00');
      service.startDrag(MOUSE_START, a, SHIFT_RECT, [a]);

      const rect = service.calculateNewPosition(510, 570, CANVAS_HEIGHT);

      expect(rect).toEqual(new Rectangle(15, 180, 185, 300));
    });

    it('formats minutes as a wall-clock time and wraps past midnight', () => {
      expect(service.formatTimeFromMinutes(510)).toBe('08:30:00');
      expect(service.formatTimeFromMinutes(1500)).toBe('01:00:00');
    });
  });
});
