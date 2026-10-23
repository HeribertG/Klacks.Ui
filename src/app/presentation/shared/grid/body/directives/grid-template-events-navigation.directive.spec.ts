// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { GridTemplateEventsDirective } from './grid-template-events.directive';
import { GridSurfaceTemplateComponent } from '../grid-surface-template/grid-surface-template.component';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridFillHandleDragService } from 'src/app/presentation/workplace/schedule/services/grid-fill-handle-drag.service';
import { GridScheduleEventsService } from 'src/app/presentation/workplace/schedule/services/grid-schedule-events.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { GridSelectionModeEnum } from '../../enums/divers';

describe('GridTemplateEventsDirective - keyboard navigation, drag edge scroll and hover', () => {
  let fixture: ComponentFixture<NavigationHostComponent>;
  let canvasEl: HTMLElement;
  let directive: GridTemplateEventsDirective;
  let drawSchedule: any;
  let gridSurface: any;
  let gridData: any;
  let gridSettings: any;
  let scroll: any;
  let cellManipulation: any;
  let scheduleEvents: any;

  @Component({
    standalone: true,
    imports: [GridTemplateEventsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appGridTemplateEvents></canvas>`,
  })
  class NavigationHostComponent {}

  const keyDown = (key: string, init: KeyboardEventInit = {}): KeyboardEvent =>
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });

  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = keyDown(key, init);
    canvasEl.dispatchEvent(event);
    return event;
  };

  const position = (): [number, number] => [drawSchedule.position.row, drawSchedule.position.column];

  const mouse = (type: string, init: MouseEventInit = {}): MouseEvent =>
    new MouseEvent(type, { bubbles: true, cancelable: true, ...init });

  beforeEach(async () => {
    drawSchedule = {
      position: new MyPosition(3, 4),
      height: 400,
      calcCorrectCoordinate: vi.fn().mockReturnValue(new MyPosition(3, 4)),
      isPositionValid: vi.fn().mockReturnValue(true),
      destroySelection: vi.fn(),
      drawSelection: vi.fn(),
      drawSelectionDynamically: vi.fn(),
      drawGridSelectedCell: vi.fn(),
      createSelection: vi.fn(),
      refresh: vi.fn(),
      refreshCell: vi.fn(),
      isFocused: false,
      hasPositionCollection: false,
    };

    gridSurface = {
      drawSchedule,
      setFocus: vi.fn(),
      destroyToolTip: vi.fn(),
      showToolTip: vi.fn(),
      hideToolTip: vi.fn(),
      valueHScrollbar: { emit: vi.fn() },
      valueVScrollbar: { emit: vi.fn() },
      valueChangeHScrollbar: vi.fn().mockReturnValue(0),
      valueChangeVScrollbar: vi.fn().mockReturnValue(0),
      contextMenu: vi.fn().mockReturnValue(null),
      notifySelectionChanged: vi.fn(),
      selectedCellRect: vi.fn().mockReturnValue(null),
    };

    gridData = { columns: 10, rows: 10, isCellActive: vi.fn().mockReturnValue(true), getCell: vi.fn().mockReturnValue(null) };
    gridSettings = { hasHeader: false, cellHeight: 20, cellWidth: 80, cellHeaderHeight: 20, selectionMode: GridSelectionModeEnum.Cell };
    scroll = { horizontalScrollPosition: 0, verticalScrollPosition: 0, visibleCols: 10, visibleRows: 10, maxRows: 10 };
    cellManipulation = { hoveredCell: { set: vi.fn() }, startEditing: vi.fn(), copy: vi.fn(), paste: vi.fn() };
    scheduleEvents = {
      workChangeDoubleClick: new Subject(), workDoubleClick: new Subject(), containerWorkDoubleClick: new Subject(),
      tryPrepareShiftDrag: vi.fn(), tryPrepareScheduleCellDrag: vi.fn(),
      tryStartPendingScheduleCellDrag: vi.fn().mockReturnValue(false), cancelPendingDrag: vi.fn(),
      cancelPendingScheduleCellDrag: vi.fn(), isShiftDragging: vi.fn().mockReturnValue(false),
      isScheduleCellDragging: vi.fn().mockReturnValue(false), updateShiftDragPosition: vi.fn(),
      updateScheduleCellDragPosition: vi.fn(), handleDoubleClick: vi.fn().mockReturnValue(false), handleDeleteKey: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NavigationHostComponent],
      providers: [
        { provide: GridSurfaceTemplateComponent, useValue: gridSurface },
        { provide: BaseDataService, useValue: gridData },
        { provide: BaseSettingsService, useValue: gridSettings },
        { provide: BaseCellManipulationService, useValue: cellManipulation },
        { provide: GridFillHandleDragService, useValue: { initialize: vi.fn(), tryStartDrag: vi.fn().mockReturnValue(false), isDragging: vi.fn().mockReturnValue(false), endDrag: vi.fn(), updateDrag: vi.fn(), updateCursorForFillHandle: vi.fn() } },
        { provide: GridScheduleEventsService, useValue: scheduleEvents },
        { provide: ScrollService, useValue: scroll },
        { provide: InputModalityService, useValue: { isTouchMode: () => false, isFingerMode: () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationHostComponent);
    const canvasDebug = fixture.debugElement.query(By.directive(GridTemplateEventsDirective));
    canvasEl = canvasDebug.nativeElement as HTMLElement;
    directive = canvasDebug.injector.get(GridTemplateEventsDirective);
    vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
      left: 10, top: 20, right: 810, bottom: 620, width: 800, height: 600, x: 10, y: 20, toJSON: () => ({}),
    } as DOMRect);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('arrow keys', () => {
    it('ArrowDown moves one row down without scrolling while the row stays fully visible', () => {
      const event = press('ArrowDown');

      expect(position()).toEqual([4, 4]);
      expect(gridSurface.valueVScrollbar.emit).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
      expect(drawSchedule.isFocused).toBe(true);
    });

    it('ArrowDown scrolls by one row once the new row reaches the last fully visible body row', () => {
      drawSchedule.height = 100;

      press('ArrowDown');

      expect(position()).toEqual([4, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(1);
    });

    it('ArrowDown subtracts the header height when it counts fully visible rows', () => {
      drawSchedule.height = 110;
      gridSettings.hasHeader = true;
      gridSettings.cellHeaderHeight = 30;

      press('ArrowDown');

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(1);
    });

    it('ArrowDown stops at the row count', () => {
      drawSchedule.position = new MyPosition(10, 4);

      press('ArrowDown');

      expect(position()).toEqual([10, 4]);
    });

    it('ArrowUp moves one row up and scrolls up when the row leaves the top', () => {
      scroll.verticalScrollPosition = 3;

      press('ArrowUp');

      expect(position()).toEqual([2, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(2);
    });

    it('ArrowUp stays on the first row', () => {
      drawSchedule.position = new MyPosition(0, 4);

      press('ArrowUp');

      expect(position()).toEqual([0, 4]);
      expect(gridSurface.valueVScrollbar.emit).not.toHaveBeenCalled();
    });

    it.each(['ArrowRight', 'Tab', 'Enter'])('%s moves one column right and scrolls at the right edge', (key) => {
      scroll.visibleCols = 6;

      press(key);

      expect(position()).toEqual([3, 5]);
      expect(gridSurface.valueHScrollbar.emit).toHaveBeenCalledWith(1);
    });

    it('ArrowRight stays on the last column', () => {
      drawSchedule.position = new MyPosition(3, 9);

      press('ArrowRight');

      expect(position()).toEqual([3, 9]);
      expect(gridSurface.valueHScrollbar.emit).not.toHaveBeenCalled();
    });

    it.each(['ArrowLeft', 'Backspace'])('%s moves one column left and scrolls when the column leaves the left edge', (key) => {
      scroll.horizontalScrollPosition = 4;

      press(key);

      expect(position()).toEqual([3, 3]);
      expect(gridSurface.valueHScrollbar.emit).toHaveBeenCalledWith(3);
      expect(drawSchedule.drawGridSelectedCell).toHaveBeenCalled();
    });

    it('ArrowLeft stays on the first column', () => {
      drawSchedule.position = new MyPosition(3, 0);

      press('ArrowLeft');

      expect(position()).toEqual([3, 0]);
    });
  });

  describe('page keys', () => {
    it('PageDown jumps to the last fully visible row', () => {
      drawSchedule.height = 100;

      press('PageDown');

      expect(position()).toEqual([4, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(4);
      expect(drawSchedule.drawGridSelectedCell).toHaveBeenCalled();
    });

    it('PageDown clamps the scroll target to maxRows', () => {
      drawSchedule.height = 100;
      scroll.maxRows = 3;

      press('PageDown');

      expect(position()).toEqual([4, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(3);
    });

    it('PageDown resets the vertical scroll when there is at most one scrollable row', () => {
      drawSchedule.height = 100;
      scroll.maxRows = 1;
      scroll.verticalScrollPosition = 2;

      press('PageDown');

      expect(scroll.verticalScrollPosition).toBe(0);
      expect(position()).toEqual([6, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(0);
    });

    it('PageDown falls back to two rows above the row count past the end', () => {
      drawSchedule.height = 100;
      gridData.rows = 3;

      press('PageDown');

      expect(position()).toEqual([1, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(1);
    });

    it('PageUp moves one visible page up', () => {
      scroll.verticalScrollPosition = 12;

      press('PageUp');

      expect(position()).toEqual([3, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(3);
      expect(drawSchedule.drawGridSelectedCell).toHaveBeenCalled();
    });

    it('PageUp clamps at the first row', () => {
      scroll.verticalScrollPosition = 2;

      press('PageUp');

      expect(position()).toEqual([0, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(0);
    });

    it('PageUp goes to the first row when there is at most one scrollable row', () => {
      scroll.verticalScrollPosition = 12;
      scroll.maxRows = 1;

      press('PageUp');

      expect(position()).toEqual([0, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(0);
    });
  });

  describe('Home and End', () => {
    it('End scrolls to maxRows and moves to the last row', () => {
      const event = press('End');

      expect(position()).toEqual([9, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(10);
      expect(event.defaultPrevented).toBe(true);
    });

    it('End scrolls to the top when there is at most one scrollable row', () => {
      scroll.maxRows = 1;

      press('End');

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(0);
    });

    it('Home scrolls to the first row and keeps the position', () => {
      press('Home');

      expect(position()).toEqual([3, 4]);
      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(0);
    });

    it.each(['Home', 'End'])('a repeated %s only prevents the default and does nothing else', (key) => {
      const event = keyDown(key, { repeat: true });
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      canvasEl.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(stopPropagation).not.toHaveBeenCalled();
      expect(gridSurface.valueVScrollbar.emit).not.toHaveBeenCalled();
      expect(position()).toEqual([3, 4]);
    });
  });

  describe('key repeat throttling', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(10_000);
    });

    it('drops a repeated ArrowDown that follows within 100 ms, but still prevents its default', () => {
      press('ArrowDown', { repeat: true });
      vi.setSystemTime(10_050);
      const throttled = press('ArrowDown', { repeat: true });

      expect(position()).toEqual([4, 4]);
      expect(throttled.defaultPrevented).toBe(true);

      vi.setSystemTime(10_100);
      press('ArrowDown', { repeat: true });

      expect(position()).toEqual([5, 4]);
    });

    it('never throttles a key press without repeat', () => {
      press('ArrowDown', { repeat: true });
      vi.setSystemTime(10_010);
      press('ArrowDown');

      expect(position()).toEqual([5, 4]);
    });

    it.each([
      ['ArrowUp', [2, 4]],
      ['ArrowLeft', [3, 3]],
      ['ArrowRight', [3, 5]],
    ] as const)('throttles a repeated %s per key', (key, expected) => {
      press(key, { repeat: true });
      vi.setSystemTime(10_050);
      press(key, { repeat: true });

      expect(position()).toEqual(expected);
    });

    it('keeps one throttle clock per direction', () => {
      press('ArrowDown', { repeat: true });
      vi.setSystemTime(10_050);
      press('ArrowRight', { repeat: true });

      expect(position()).toEqual([4, 5]);
    });

    it('throttles repeated PageDown and PageUp', () => {
      drawSchedule.height = 100;
      press('PageDown', { repeat: true });
      vi.setSystemTime(10_050);
      press('PageDown', { repeat: true });

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledTimes(1);

      scroll.verticalScrollPosition = 12;
      press('PageUp', { repeat: true });
      vi.setSystemTime(10_080);
      press('PageUp', { repeat: true });

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledTimes(2);
    });

    it('a mouseup resets the throttle clocks', () => {
      press('ArrowDown', { repeat: true });
      canvasEl.dispatchEvent(mouse('mouseup'));
      vi.setSystemTime(10_050);
      press('ArrowDown', { repeat: true });

      expect(position()).toEqual([5, 4]);
    });
  });

  describe('drag edge auto-scroll', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(10_000);
      canvasEl.dispatchEvent(mouse('mousedown', { buttons: 1 }));
      gridSurface.valueVScrollbar.emit.mockClear();
      gridSurface.valueHScrollbar.emit.mockClear();
    });

    const dragTo = (row: number, column: number): void => {
      drawSchedule.calcCorrectCoordinate.mockReturnValue(new MyPosition(row, column));
      directive.onMouseMove(mouse('mousemove', { buttons: 1 }));
    };

    it('scrolls down at the bottom edge and draws the rubber band', () => {
      dragTo(19, 4);

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(1);
      expect(drawSchedule.drawSelectionDynamically).toHaveBeenCalled();
    });

    it('accelerates: the interval starts at 220 ms and decays with the time spent at the edge', () => {
      dragTo(19, 4);
      vi.setSystemTime(10_100);
      dragTo(19, 4);

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledTimes(1);

      vi.setSystemTime(10_250);
      dragTo(19, 4);

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledTimes(2);
    });

    it('restarts the edge timer after the pointer leaves the edge', () => {
      dragTo(19, 4);
      vi.setSystemTime(10_050);
      dragTo(5, 4);
      vi.setSystemTime(10_100);
      dragTo(19, 4);

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledTimes(2);
    });

    it('scrolls up at the top edge and right at the right edge', () => {
      scroll.verticalScrollPosition = 3;
      dragTo(3, 9);

      expect(gridSurface.valueVScrollbar.emit).toHaveBeenCalledWith(2);
      expect(gridSurface.valueHScrollbar.emit).toHaveBeenCalledWith(1);
    });

    it('scrolls left at the left edge', () => {
      scroll.horizontalScrollPosition = 4;
      dragTo(5, 4);

      expect(gridSurface.valueHScrollbar.emit).toHaveBeenCalledWith(3);
    });

    it('does not scroll or draw in row selection mode', () => {
      gridSettings.selectionMode = GridSelectionModeEnum.Row;
      dragTo(19, 4);

      expect(gridSurface.valueVScrollbar.emit).not.toHaveBeenCalled();
      expect(drawSchedule.drawSelectionDynamically).not.toHaveBeenCalled();
    });

    it('creates the selection on mouseup after a rubber band drag', () => {
      dragTo(5, 6);
      drawSchedule.calcCorrectCoordinate.mockReturnValue(new MyPosition(5, 6));

      canvasEl.dispatchEvent(mouse('mouseup'));

      expect(drawSchedule.createSelection).toHaveBeenCalledWith(new MyPosition(5, 6));
    });
  });

  describe('hover', () => {
    it('reports the hovered header column when the pointer is over the header', () => {
      gridSettings.hasHeader = true;
      scroll.horizontalScrollPosition = 2;

      directive.onMouseMove(mouse('mousemove', { clientX: 180, clientY: 30 }));

      expect(cellManipulation.hoveredCell.set).toHaveBeenCalledWith({
        row: -1, column: 4, isEmpty: true, isHeader: true, clientX: 180, clientY: 30,
      });
      expect(drawSchedule.calcCorrectCoordinate).not.toHaveBeenCalled();
    });

    it('clears the hovered cell when the header column is outside the grid', () => {
      gridSettings.hasHeader = true;
      scroll.horizontalScrollPosition = 9;

      directive.onMouseMove(mouse('mousemove', { clientX: 180, clientY: 30 }));

      expect(cellManipulation.hoveredCell.set).toHaveBeenCalledWith(null);
    });

    it('reports the hovered body cell and whether it is empty', () => {
      gridData.isCellActive.mockReturnValue(false);

      directive.onMouseMove(mouse('mousemove', { clientX: 50, clientY: 60 }));

      expect(cellManipulation.hoveredCell.set).toHaveBeenCalledWith({
        row: 3, column: 4, isEmpty: true, isHeader: false, clientX: 50, clientY: 60,
      });
      expect(gridSurface.hideToolTip).toHaveBeenCalled();
    });

    it('clears the hovered cell outside the grid', () => {
      drawSchedule.isPositionValid.mockReturnValue(false);

      directive.onMouseMove(mouse('mousemove', { clientX: 50, clientY: 60 }));

      expect(cellManipulation.hoveredCell.set).toHaveBeenCalledWith(null);
      expect(gridSurface.hideToolTip).toHaveBeenCalled();
    });
  });
});
