// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GridSurfaceTemplateComponent } from './grid-surface-template.component';
import { GridCellInputController } from './grid-cell-input.controller';
import { GridResizeController } from './grid-resize.controller';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import { BaseCellManipulationService } from '../../services/body/cell-manipulation.service';
import { GridFontsService } from '../../services/grid-fonts.service';
import { GridCoordinateService } from '../../services/grid-coordinate.service';
import { TestAccessibilityService } from '../../services/grid-test-accessibility/test-accessibility.service';
import { GridTestAccessibilityService } from '../../services/grid-test-accessibility/grid-test-accessibility.service';
import { GridFillHandleDragService } from 'src/app/presentation/workplace/schedule/services/grid-fill-handle-drag.service';
import { TooltipService } from '../../../tooltip/tooltip.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { MyPosition } from '../../classes/position';

const CELL_WIDTH = 90;
const CELL_HEIGHT = 30;
const HEADER_HEIGHT = 20;
const START_COLUMN = 5;
const START_ROW = 5;
const BOX_WIDTH = 900;
const BOX_HEIGHT = 600;

describe('GridSurfaceTemplateComponent - touch gestures', () => {
  let component: GridSurfaceTemplateComponent;
  let scroll: any;
  let drawSchedule: any;
  let cellManipulation: any;
  let fillHandleDrag: any;
  let cellInput: any;
  let coord: any;
  let hEmits: number[];
  let vEmits: number[];

  const touchPointer = (clientX: number, clientY: number): PointerEvent =>
    new PointerEvent('pointerdown', { pointerType: 'touch', clientX, clientY });

  beforeEach(() => {
    scroll = {
      horizontalScrollPosition: START_COLUMN,
      verticalScrollPosition: START_ROW,
      visibleCols: 10,
      visibleRows: 10,
      maxCols: 100,
      maxRows: 100,
      updateScrollPosition: vi.fn(),
    };

    drawSchedule = {
      position: null,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
      calcCorrectCoordinate: vi.fn().mockReturnValue(new MyPosition(1, 2)),
      isPositionValid: vi.fn().mockReturnValue(true),
      isCanvasAvailable: vi.fn().mockReturnValue(false),
    };

    cellManipulation = {
      isPositionInSelection: vi.fn().mockReturnValue(false),
      positionSignal: vi.fn(),
      isEditing: vi.fn(),
      Position: new MyPosition(-1, -1),
      PositionCollection: {
        clear: vi.fn(),
        count: vi.fn().mockReturnValue(0),
        minRow: vi.fn().mockReturnValue(0),
        minColumn: vi.fn().mockReturnValue(0),
        maxColumn: vi.fn().mockReturnValue(0),
      },
    };

    fillHandleDrag = { isPointerOverFillHandle: vi.fn().mockReturnValue(false) };
    cellInput = { visible: vi.fn().mockReturnValue(false) };
    coord = { cellX: vi.fn((visibleColumn: number) => visibleColumn * CELL_WIDTH) };

    TestBed.configureTestingModule({
      providers: [
        { provide: ScrollService, useValue: scroll },
        { provide: BaseDrawScheduleService, useValue: drawSchedule },
        { provide: BaseCellManipulationService, useValue: cellManipulation },
        { provide: GridFillHandleDragService, useValue: fillHandleDrag },
        { provide: GridCellInputController, useValue: cellInput },
        { provide: GridResizeController, useValue: { observeParent: vi.fn(), disconnect: vi.fn(), applyPendingResize: vi.fn() } },
        { provide: BaseSettingsService, useValue: { cellWidth: CELL_WIDTH, cellHeight: CELL_HEIGHT, cellHeaderHeight: HEADER_HEIGHT, hasHeader: false, zoomSignal: vi.fn() } },
        { provide: BaseDataService, useValue: { columns: 100, rows: 100, setMetrics: vi.fn(), refreshSignal: vi.fn() } },
        { provide: GridFontsService, useValue: {} },
        { provide: GridCoordinateService, useValue: coord },
        { provide: TooltipService, useValue: { show: vi.fn(), hide: vi.fn() } },
        { provide: TestAccessibilityService, useValue: { ghostCells: vi.fn().mockReturnValue([]) } },
        { provide: GridTestAccessibilityService, useValue: { enabled: vi.fn().mockReturnValue(false), initialize: vi.fn() } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn(), markForCheck: vi.fn() } },
        { provide: ElementRef, useValue: new ElementRef(document.createElement('canvas')) },
      ],
    });

    component = TestBed.runInInjectionContext(() => new GridSurfaceTemplateComponent());

    hEmits = [];
    vEmits = [];
    component.valueHScrollbar.subscribe((value) => hEmits.push(value));
    component.valueVScrollbar.subscribe((value) => vEmits.push(value));
  });

  describe('onTouchPan', () => {
    it('keeps sub-cell movement as a remainder instead of emitting', () => {
      component.onTouchPan({ dx: -25, dy: -10 });

      expect(hEmits).toEqual([]);
      expect(vEmits).toEqual([]);
    });

    it('accumulates pan pixels into whole-cell scroll emits and inverts the sign, because the finger moves the content', () => {
      component.onTouchPan({ dx: -25, dy: -10 });
      component.onTouchPan({ dx: -70, dy: -25 });

      expect(hEmits).toEqual([START_COLUMN + 1]);
      expect(vEmits).toEqual([START_ROW + 1]);
    });

    it('scrolls backwards when the finger drags the content forwards', () => {
      component.onTouchPan({ dx: CELL_WIDTH * 2, dy: CELL_HEIGHT * 3 });

      expect(hEmits).toEqual([START_COLUMN - 2]);
      expect(vEmits).toEqual([START_ROW - 3]);
    });

    it('never emits a negative scroll position', () => {
      component.onTouchPan({ dx: CELL_WIDTH * 50, dy: CELL_HEIGHT * 50 });

      expect(hEmits).toEqual([0]);
      expect(vEmits).toEqual([0]);
    });

    it('ignores a pan while the cell metrics are not usable yet', () => {
      (TestBed.inject(BaseSettingsService) as any).cellWidth = 0;
      (TestBed.inject(BaseSettingsService) as any).cellHeight = 0;

      component.onTouchPan({ dx: -500, dy: -500 });

      expect(hEmits).toEqual([]);
      expect(vEmits).toEqual([]);
    });
  });

  describe('isPointerOnSelection', () => {
    it('is false on a cell outside the current selection, so the gesture becomes a pan', () => {
      expect(component.isPointerOnSelection(touchPointer(10, 10))).toBe(false);
    });

    it('is true on a cell that belongs to the current selection', () => {
      cellManipulation.isPositionInSelection.mockReturnValue(true);

      expect(component.isPointerOnSelection(touchPointer(10, 10))).toBe(true);
    });

    it('is true on the fill handle even when the position is not part of the selection', () => {
      fillHandleDrag.isPointerOverFillHandle.mockReturnValue(true);

      expect(component.isPointerOnSelection(touchPointer(10, 10))).toBe(true);
    });

    it('is false on an invalid position', () => {
      cellManipulation.isPositionInSelection.mockReturnValue(true);
      drawSchedule.isPositionValid.mockReturnValue(false);

      expect(component.isPointerOnSelection(touchPointer(10, 10))).toBe(false);
    });

    it('is false while the cell input overlay is open', () => {
      cellManipulation.isPositionInSelection.mockReturnValue(true);
      cellInput.visible.mockReturnValue(true);

      expect(component.isPointerOnSelection(touchPointer(10, 10))).toBe(false);
    });
  });

  describe('selectedCellRect', () => {
    it('is null while nothing is selected', () => {
      drawSchedule.position = null;

      expect(component.selectedCellRect()).toBeNull();
    });

    it('uses the same geometry as the hit test: coordinate service for x, unconditional header offset for y', () => {
      drawSchedule.position = new MyPosition(START_ROW + 2, START_COLUMN + 3);

      expect(component.selectedCellRect()).toEqual({
        left: 3 * CELL_WIDTH,
        top: HEADER_HEIGHT + 2 * CELL_HEIGHT,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
      });
    });

    it('anchors on the visually trailing column and the top row of a multi cell selection', () => {
      drawSchedule.position = new MyPosition(START_ROW + 4, START_COLUMN + 1);
      cellManipulation.PositionCollection.count.mockReturnValue(4);
      cellManipulation.PositionCollection.minRow.mockReturnValue(START_ROW + 1);
      cellManipulation.PositionCollection.minColumn.mockReturnValue(START_COLUMN + 1);
      cellManipulation.PositionCollection.maxColumn.mockReturnValue(START_COLUMN + 2);
      component.notifySelectionChanged();

      expect(component.selectedCellRect()).toEqual({
        left: 2 * CELL_WIDTH,
        top: HEADER_HEIGHT + CELL_HEIGHT,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
      });
    });

    it('is null while the selected cell is scrolled out of the viewport', () => {
      drawSchedule.position = new MyPosition(START_ROW + 100, START_COLUMN);
      component.notifySelectionChanged();

      expect(component.selectedCellRect()).toBeNull();
    });

    it('follows the zoom, because the cell metrics already carry the zoom factor', () => {
      const settings = TestBed.inject(BaseSettingsService) as any;
      settings.cellWidth = CELL_WIDTH * 1.5;
      settings.cellHeight = CELL_HEIGHT * 1.5;
      settings.cellHeaderHeight = HEADER_HEIGHT * 1.5;
      coord.cellX.mockImplementation((visibleColumn: number) => visibleColumn * CELL_WIDTH * 1.5);
      drawSchedule.position = new MyPosition(START_ROW + 2, START_COLUMN + 3);
      component.notifySelectionChanged();

      expect(component.selectedCellRect()).toEqual({
        left: 3 * CELL_WIDTH * 1.5,
        top: HEADER_HEIGHT * 1.5 + 2 * CELL_HEIGHT * 1.5,
        width: CELL_WIDTH * 1.5,
        height: CELL_HEIGHT * 1.5,
      });
    });

    it('recomputes after a scroll, so the button follows the cell', () => {
      drawSchedule.position = new MyPosition(START_ROW + 2, START_COLUMN + 3);
      const before = component.selectedCellRect();

      scroll.verticalScrollPosition = START_ROW + 1;
      component.notifySelectionChanged();

      expect(before?.top).toBe(HEADER_HEIGHT + 2 * CELL_HEIGHT);
      expect(component.selectedCellRect()?.top).toBe(HEADER_HEIGHT + CELL_HEIGHT);
    });
  });

  describe('onCellActionsOpen', () => {
    it('re-emits the button position on the right click output, so the menu opens through the existing path', () => {
      const rightClicks: unknown[] = [];
      component.rightClick.subscribe((event) => rightClicks.push(event));
      drawSchedule.position = new MyPosition(7, 9);

      component.onCellActionsOpen({ clientX: 300, clientY: 244 });

      expect(rightClicks).toEqual([
        { row: 7, column: 9, clientX: 300, clientY: 244, source: 'canvas' },
      ]);
    });

    it('stays silent when the selection is no longer valid', () => {
      const rightClicks: unknown[] = [];
      component.rightClick.subscribe((event) => rightClicks.push(event));
      drawSchedule.position = new MyPosition(7, 9);
      drawSchedule.isPositionValid.mockReturnValue(false);

      component.onCellActionsOpen({ clientX: 300, clientY: 244 });

      expect(rightClicks).toEqual([]);
    });
  });
});
