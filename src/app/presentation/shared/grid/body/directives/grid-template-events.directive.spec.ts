// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';
import { LongPressContextDirective } from 'src/app/presentation/directives/long-press-context.directive';

const createMouseEvent = (
  type: string,
  init: Partial<MouseEvent> = {}
): MouseEvent =>
  new MouseEvent(type, { bubbles: true, cancelable: true, ...init });

describe('GridTemplateEventsDirective - Safari right-click via contextmenu', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let canvasEl: HTMLElement;
  let drawSchedule: any;
  let scheduleEvents: any;
  let fillHandleDrag: any;
  let gridSurface: any;

  @Component({
    standalone: true,
    imports: [GridTemplateEventsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appGridTemplateEvents (rightClick)="onRightClick($event)"></canvas>`,
  })
  class TestHostComponent {
    rightClickEvent: unknown = null;
    onRightClick(event: unknown): void {
      this.rightClickEvent = event;
    }
  }

  beforeEach(async () => {
    const targetPos = new MyPosition(1, 2);

    drawSchedule = {
      position: null,
      height: 400,
      calcCorrectCoordinate: vi.fn().mockReturnValue(targetPos),
      isPositionValid: vi.fn().mockReturnValue(true),
      destroySelection: vi.fn(),
      drawSelection: vi.fn(),
      drawSelectionDynamically: vi.fn(),
      drawGridSelectedCell: vi.fn(),
      refresh: vi.fn(),
      refreshCell: vi.fn(),
      isFocused: false,
      hasPositionCollection: false,
    };

    scheduleEvents = {
      workChangeDoubleClick: new Subject(),
      workDoubleClick: new Subject(),
      containerWorkDoubleClick: new Subject(),
      tryPrepareShiftDrag: vi.fn(),
      tryPrepareScheduleCellDrag: vi.fn(),
      tryStartPendingScheduleCellDrag: vi.fn().mockReturnValue(false),
      cancelPendingDrag: vi.fn(),
      cancelPendingScheduleCellDrag: vi.fn(),
      isShiftDragging: vi.fn().mockReturnValue(false),
      isScheduleCellDragging: vi.fn().mockReturnValue(false),
      updateShiftDragPosition: vi.fn(),
      updateScheduleCellDragPosition: vi.fn(),
      handleDoubleClick: vi.fn().mockReturnValue(false),
      handleDeleteKey: vi.fn(),
    };

    fillHandleDrag = {
      initialize: vi.fn(),
      tryStartDrag: vi.fn().mockReturnValue(false),
      isDragging: vi.fn().mockReturnValue(false),
      endDrag: vi.fn(),
      updateDrag: vi.fn(),
      updateCursorForFillHandle: vi.fn(),
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

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: GridSurfaceTemplateComponent, useValue: gridSurface },
        { provide: BaseDataService, useValue: { columns: 10, rows: 10, isCellActive: vi.fn().mockReturnValue(true), getCell: vi.fn().mockReturnValue(null) } },
        { provide: BaseSettingsService, useValue: { hasHeader: false, cellHeight: 20, cellWidth: 80, cellHeaderHeight: 20, selectionMode: 0 } },
        { provide: BaseCellManipulationService, useValue: { hoveredCell: { set: vi.fn() }, startEditing: vi.fn(), copy: vi.fn(), paste: vi.fn() } },
        { provide: GridFillHandleDragService, useValue: fillHandleDrag },
        { provide: GridScheduleEventsService, useValue: scheduleEvents },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0, visibleCols: 10, visibleRows: 10, maxRows: 10 } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  });

  it('does not open the context menu from a plain mousedown with buttons=2 (native contextmenu is the single trigger)', () => {
    canvasEl.dispatchEvent(createMouseEvent('mousedown', { buttons: 2 } as any));

    expect(fixture.componentInstance.rightClickEvent).toBeNull();
  });

  it('opens the context menu from the native contextmenu event', () => {
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 50, clientY: 60 } as any));

    expect(fixture.componentInstance.rightClickEvent).toEqual({
      row: 1,
      column: 2,
      clientX: 50,
      clientY: 60,
    });
  });

  it('reproduces the Safari Ctrl+Click sequence: mousedown fires as button 0, contextmenu still opens the menu without leaving drag state behind', () => {
    // Safari/WebKit reports a macOS secondary-click (Ctrl+Click) as an ordinary
    // primary-button mousedown (buttons=1, ctrlKey=true), then dispatches contextmenu.
    canvasEl.dispatchEvent(
      createMouseEvent('mousedown', { buttons: 1, ctrlKey: true } as any)
    );
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 10, clientY: 20 } as any));

    expect(fixture.componentInstance.rightClickEvent).toEqual({
      row: 1,
      column: 2,
      clientX: 10,
      clientY: 20,
    });
    expect(scheduleEvents.cancelPendingDrag).toHaveBeenCalled();
    expect(scheduleEvents.cancelPendingScheduleCellDrag).toHaveBeenCalled();
  });
});

describe('GridTemplateEventsDirective - tooltip auto-hide in touch mode', () => {
  let fixture: ComponentFixture<TooltipHostComponent>;
  let canvasEl: HTMLElement;
  let gridSurface: any;
  let isTouchMode: boolean;

  @Component({
    standalone: true,
    imports: [GridTemplateEventsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appGridTemplateEvents></canvas>`,
  })
  class TooltipHostComponent {}

  const setup = async (touchMode: boolean): Promise<void> => {
    isTouchMode = touchMode;
    const drawSchedule = {
      position: null,
      height: 400,
      calcCorrectCoordinate: vi.fn().mockReturnValue(new MyPosition(1, 2)),
      isPositionValid: vi.fn().mockReturnValue(true),
      destroySelection: vi.fn(),
      drawSelection: vi.fn(),
      drawSelectionDynamically: vi.fn(),
      drawGridSelectedCell: vi.fn(),
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

    await TestBed.configureTestingModule({
      imports: [TooltipHostComponent],
      providers: [
        { provide: GridSurfaceTemplateComponent, useValue: gridSurface },
        { provide: BaseDataService, useValue: { columns: 10, rows: 10, isCellActive: vi.fn().mockReturnValue(true), getCell: vi.fn().mockReturnValue({ tooltip: 'a tooltip' }) } },
        { provide: BaseSettingsService, useValue: { hasHeader: false, cellHeight: 20, cellWidth: 80, cellHeaderHeight: 20, selectionMode: 0 } },
        { provide: BaseCellManipulationService, useValue: { hoveredCell: { set: vi.fn() }, startEditing: vi.fn(), copy: vi.fn(), paste: vi.fn() } },
        { provide: GridFillHandleDragService, useValue: { initialize: vi.fn(), tryStartDrag: vi.fn().mockReturnValue(false), isDragging: vi.fn().mockReturnValue(false), endDrag: vi.fn(), updateDrag: vi.fn(), updateCursorForFillHandle: vi.fn() } },
        { provide: GridScheduleEventsService, useValue: { workChangeDoubleClick: new Subject(), workDoubleClick: new Subject(), containerWorkDoubleClick: new Subject(), tryPrepareShiftDrag: vi.fn(), tryPrepareScheduleCellDrag: vi.fn(), tryStartPendingScheduleCellDrag: vi.fn().mockReturnValue(false), cancelPendingDrag: vi.fn(), cancelPendingScheduleCellDrag: vi.fn(), isShiftDragging: vi.fn().mockReturnValue(false), isScheduleCellDragging: vi.fn().mockReturnValue(false), updateShiftDragPosition: vi.fn(), updateScheduleCellDragPosition: vi.fn(), handleDoubleClick: vi.fn().mockReturnValue(false), handleDeleteKey: vi.fn() } },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0, visibleCols: 10, visibleRows: 10, maxRows: 10 } },
        { provide: InputModalityService, useValue: { isTouchMode: () => isTouchMode, isFingerMode: () => isTouchMode } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  };

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  it('hides a tooltip shown by a tap after the auto-hide delay', async () => {
    await setup(true);

    canvasEl.dispatchEvent(createMouseEvent('mousemove', { clientX: 30, clientY: 40 } as any));
    expect(gridSurface.showToolTip).toHaveBeenCalledTimes(1);
    expect(gridSurface.hideToolTip).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TouchInteraction.TooltipAutoHideMs);

    expect(gridSurface.hideToolTip).toHaveBeenCalledTimes(1);
  });

  it('keeps the tooltip open with a mouse, where mouseleave ends it', async () => {
    await setup(false);

    canvasEl.dispatchEvent(createMouseEvent('mousemove', { clientX: 30, clientY: 40 } as any));
    vi.advanceTimersByTime(TouchInteraction.TooltipAutoHideMs);

    expect(gridSurface.showToolTip).toHaveBeenCalledTimes(1);
    expect(gridSurface.hideToolTip).not.toHaveBeenCalled();
  });

  it('cancels a pending auto-hide when the pointer leaves the canvas', async () => {
    await setup(true);

    canvasEl.dispatchEvent(createMouseEvent('mousemove', { clientX: 30, clientY: 40 } as any));
    canvasEl.dispatchEvent(createMouseEvent('mouseleave', {} as any));
    vi.advanceTimersByTime(TouchInteraction.TooltipAutoHideMs);

    expect(gridSurface.destroyToolTip).toHaveBeenCalledTimes(1);
    expect(gridSurface.hideToolTip).not.toHaveBeenCalled();
  });
});

describe('GridTemplateEventsDirective - press-and-hold drags in touch mode', () => {
  let fixture: ComponentFixture<DragHostComponent>;
  let canvasEl: HTMLElement;
  let scheduleEvents: any;
  let isTouchMode: boolean;
  let isFingerMode: boolean;

  @Component({
    standalone: true,
    imports: [GridTemplateEventsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appGridTemplateEvents id="drag-host-canvas"></canvas>`,
  })
  class DragHostComponent {}

  const setup = async (touchMode: boolean, fingerMode = touchMode): Promise<void> => {
    isTouchMode = touchMode;
    isFingerMode = fingerMode;
    const drawSchedule = {
      position: null,
      height: 400,
      calcCorrectCoordinate: vi.fn().mockReturnValue(new MyPosition(1, 2)),
      isPositionValid: vi.fn().mockReturnValue(true),
      destroySelection: vi.fn(),
      drawSelection: vi.fn(),
      drawSelectionDynamically: vi.fn(),
      drawGridSelectedCell: vi.fn(),
      refresh: vi.fn(),
      refreshCell: vi.fn(),
      isFocused: false,
      hasPositionCollection: false,
    };

    scheduleEvents = {
      workChangeDoubleClick: new Subject(),
      workDoubleClick: new Subject(),
      containerWorkDoubleClick: new Subject(),
      tryPrepareShiftDrag: vi.fn(),
      tryPrepareScheduleCellDrag: vi.fn(),
      tryStartPendingScheduleCellDrag: vi.fn().mockReturnValue(false),
      cancelPendingDrag: vi.fn(),
      cancelPendingScheduleCellDrag: vi.fn(),
      isShiftDragging: vi.fn().mockReturnValue(false),
      isScheduleCellDragging: vi.fn().mockReturnValue(false),
      updateShiftDragPosition: vi.fn(),
      updateScheduleCellDragPosition: vi.fn(),
      handleDoubleClick: vi.fn().mockReturnValue(false),
      handleDeleteKey: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DragHostComponent],
      providers: [
        {
          provide: GridSurfaceTemplateComponent,
          useValue: {
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
          },
        },
        { provide: BaseDataService, useValue: { columns: 10, rows: 10, isCellActive: vi.fn().mockReturnValue(true), getCell: vi.fn().mockReturnValue(null) } },
        { provide: BaseSettingsService, useValue: { hasHeader: false, cellHeight: 20, cellWidth: 80, cellHeaderHeight: 20, selectionMode: 0 } },
        { provide: BaseCellManipulationService, useValue: { hoveredCell: { set: vi.fn() }, startEditing: vi.fn(), copy: vi.fn(), paste: vi.fn() } },
        { provide: GridFillHandleDragService, useValue: { initialize: vi.fn(), tryStartDrag: vi.fn().mockReturnValue(false), isDragging: vi.fn().mockReturnValue(false), endDrag: vi.fn(), updateDrag: vi.fn(), updateCursorForFillHandle: vi.fn() } },
        { provide: GridScheduleEventsService, useValue: scheduleEvents },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0, visibleCols: 10, visibleRows: 10, maxRows: 10 } },
        { provide: InputModalityService, useValue: { isTouchMode: () => isTouchMode, isFingerMode: () => isFingerMode } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DragHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  };

  it('arms shift drag and work move drag with a mouse', async () => {
    await setup(false);

    canvasEl.dispatchEvent(createMouseEvent('mousedown', { buttons: 1 } as any));

    expect(scheduleEvents.tryPrepareShiftDrag).toHaveBeenCalledTimes(1);
    expect(scheduleEvents.tryPrepareScheduleCellDrag).toHaveBeenCalledTimes(1);
  });

  it('leaves both press-and-hold drags disarmed in touch mode, so a long press can open the menu', async () => {
    await setup(true);

    canvasEl.dispatchEvent(createMouseEvent('mousedown', { buttons: 1 } as any));

    expect(scheduleEvents.tryPrepareShiftDrag).not.toHaveBeenCalled();
    expect(scheduleEvents.tryPrepareScheduleCellDrag).not.toHaveBeenCalled();
  });

  it('keeps both press-and-hold drags armed for a pen, which behaves like a mouse for move-drags', async () => {
    await setup(true, false);

    canvasEl.dispatchEvent(createMouseEvent('mousedown', { buttons: 1 } as any));

    expect(scheduleEvents.tryPrepareShiftDrag).toHaveBeenCalledTimes(1);
    expect(scheduleEvents.tryPrepareScheduleCellDrag).toHaveBeenCalledTimes(1);
  });

  it('still selects the cell under the finger in touch mode', async () => {
    await setup(true);

    canvasEl.dispatchEvent(createMouseEvent('mousedown', { buttons: 1 } as any));

    expect(TestBed.inject(GridSurfaceTemplateComponent).setFocus).toHaveBeenCalled();
  });
});

describe('GridTemplateEventsDirective - long press opens the context menu', () => {
  let fixture: ComponentFixture<LongPressHostComponent>;
  let canvasEl: HTMLElement;

  @Component({
    standalone: true,
    imports: [GridTemplateEventsDirective, LongPressContextDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas
      appGridTemplateEvents
      appLongPressContext
      id="long-press-host-canvas"
      (rightClick)="onRightClick($event)"
    ></canvas>`,
  })
  class LongPressHostComponent {
    rightClickEvent: unknown = null;
    rightClickCount = 0;
    onRightClick(event: unknown): void {
      this.rightClickEvent = event;
      this.rightClickCount = this.rightClickCount + 1;
    }
  }

  const touchPointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 5,
      pointerType: 'touch',
      clientX: 120,
      clientY: 140,
      ...init,
    });

  beforeEach(async () => {
    vi.useFakeTimers();
    const drawSchedule = {
      position: null,
      height: 400,
      calcCorrectCoordinate: vi.fn().mockReturnValue(new MyPosition(3, 4)),
      isPositionValid: vi.fn().mockReturnValue(true),
      destroySelection: vi.fn(),
      drawSelection: vi.fn(),
      drawSelectionDynamically: vi.fn(),
      drawGridSelectedCell: vi.fn(),
      refresh: vi.fn(),
      refreshCell: vi.fn(),
      isFocused: false,
      hasPositionCollection: false,
    };

    await TestBed.configureTestingModule({
      imports: [LongPressHostComponent],
      providers: [
        {
          provide: GridSurfaceTemplateComponent,
          useValue: {
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
          },
        },
        { provide: BaseDataService, useValue: { columns: 10, rows: 10, isCellActive: vi.fn().mockReturnValue(true), getCell: vi.fn().mockReturnValue(null) } },
        { provide: BaseSettingsService, useValue: { hasHeader: false, cellHeight: 20, cellWidth: 80, cellHeaderHeight: 20, selectionMode: 0 } },
        { provide: BaseCellManipulationService, useValue: { hoveredCell: { set: vi.fn() }, startEditing: vi.fn(), copy: vi.fn(), paste: vi.fn() } },
        { provide: GridFillHandleDragService, useValue: { initialize: vi.fn(), tryStartDrag: vi.fn().mockReturnValue(false), isDragging: vi.fn().mockReturnValue(false), endDrag: vi.fn(), updateDrag: vi.fn(), updateCursorForFillHandle: vi.fn() } },
        { provide: GridScheduleEventsService, useValue: { workChangeDoubleClick: new Subject(), workDoubleClick: new Subject(), containerWorkDoubleClick: new Subject(), tryPrepareShiftDrag: vi.fn(), tryPrepareScheduleCellDrag: vi.fn(), tryStartPendingScheduleCellDrag: vi.fn().mockReturnValue(false), cancelPendingDrag: vi.fn(), cancelPendingScheduleCellDrag: vi.fn(), isShiftDragging: vi.fn().mockReturnValue(false), isScheduleCellDragging: vi.fn().mockReturnValue(false), updateShiftDragPosition: vi.fn(), updateScheduleCellDragPosition: vi.fn(), handleDoubleClick: vi.fn().mockReturnValue(false), handleDeleteKey: vi.fn() } },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0, visibleCols: 10, visibleRows: 10, maxRows: 10 } },
        { provide: InputModalityService, useValue: { isTouchMode: () => true, isFingerMode: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LongPressHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('emits rightClick with row, column and the finger position after the long-press duration', () => {
    canvasEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(fixture.componentInstance.rightClickEvent).toEqual({
      row: 3,
      column: 4,
      clientX: 120,
      clientY: 140,
    });
  });

  it('emits rightClick only once when the browser adds its own contextmenu afterwards', () => {
    canvasEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(touchPointer('pointerup'));
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 120, clientY: 140 } as any));

    expect(fixture.componentInstance.rightClickCount).toBe(1);
  });

  it('emits rightClick only once when the browser sends its contextmenu while the finger is still down', () => {
    canvasEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs - 100);
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 120, clientY: 140 } as any));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(fixture.componentInstance.rightClickCount).toBe(1);
  });

  it('does not emit rightClick when the finger moves away before the long-press duration', () => {
    canvasEl.dispatchEvent(touchPointer('pointerdown'));
    document.dispatchEvent(
      touchPointer('pointermove', { clientX: 120 + TouchInteraction.MoveTolerancePx + 5 }),
    );
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(fixture.componentInstance.rightClickCount).toBe(0);
  });
});

describe('GridTemplateEventsDirective - keyboard context menu key', () => {
  let fixture: ComponentFixture<KeyboardHostComponent>;
  let canvasEl: HTMLElement;
  let gridSurface: any;

  @Component({
    standalone: true,
    imports: [GridTemplateEventsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas
      appGridTemplateEvents
      id="keyboard-host-canvas"
      (rightClick)="onRightClick($event)"
    ></canvas>`,
  })
  class KeyboardHostComponent {
    rightClickEvents: unknown[] = [];
    onRightClick(event: unknown): void {
      this.rightClickEvents.push(event);
    }
  }

  const keyDown = (key: string, init: KeyboardEventInit = {}): KeyboardEvent =>
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });

  beforeEach(async () => {
    const drawSchedule = {
      position: new MyPosition(3, 4),
      height: 400,
      calcCorrectCoordinate: vi.fn().mockReturnValue(new MyPosition(3, 4)),
      isPositionValid: vi.fn().mockReturnValue(true),
      destroySelection: vi.fn(),
      drawSelection: vi.fn(),
      drawSelectionDynamically: vi.fn(),
      drawGridSelectedCell: vi.fn(),
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
      selectedCellRect: vi.fn().mockReturnValue({ left: 80, top: 60, width: 80, height: 20 }),
    };

    await TestBed.configureTestingModule({
      imports: [KeyboardHostComponent],
      providers: [
        { provide: GridSurfaceTemplateComponent, useValue: gridSurface },
        { provide: BaseDataService, useValue: { columns: 10, rows: 10, isCellActive: vi.fn().mockReturnValue(true), getCell: vi.fn().mockReturnValue(null) } },
        { provide: BaseSettingsService, useValue: { hasHeader: false, cellHeight: 20, cellWidth: 80, cellHeaderHeight: 20, selectionMode: 0 } },
        { provide: BaseCellManipulationService, useValue: { hoveredCell: { set: vi.fn() }, startEditing: vi.fn(), copy: vi.fn(), paste: vi.fn() } },
        { provide: GridFillHandleDragService, useValue: { initialize: vi.fn(), tryStartDrag: vi.fn().mockReturnValue(false), isDragging: vi.fn().mockReturnValue(false), endDrag: vi.fn(), updateDrag: vi.fn(), updateCursorForFillHandle: vi.fn() } },
        { provide: GridScheduleEventsService, useValue: { workChangeDoubleClick: new Subject(), workDoubleClick: new Subject(), containerWorkDoubleClick: new Subject(), tryPrepareShiftDrag: vi.fn(), tryPrepareScheduleCellDrag: vi.fn(), tryStartPendingScheduleCellDrag: vi.fn().mockReturnValue(false), cancelPendingDrag: vi.fn(), cancelPendingScheduleCellDrag: vi.fn(), isShiftDragging: vi.fn().mockReturnValue(false), isScheduleCellDragging: vi.fn().mockReturnValue(false), updateShiftDragPosition: vi.fn(), updateScheduleCellDragPosition: vi.fn(), handleDoubleClick: vi.fn().mockReturnValue(false), handleDeleteKey: vi.fn() } },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0, visibleCols: 10, visibleRows: 10, maxRows: 10 } },
        { provide: InputModalityService, useValue: { isTouchMode: () => false, isFingerMode: () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyboardHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
      left: 10, top: 20, right: 810, bottom: 620, width: 800, height: 600, x: 10, y: 20, toJSON: () => ({}),
    } as DOMRect);
    fixture.detectChanges();
  });

  it('opens the context menu at the centre of the selected cell when the ContextMenu key is pressed', () => {
    canvasEl.dispatchEvent(keyDown('ContextMenu'));

    expect(fixture.componentInstance.rightClickEvents).toEqual([
      { row: 3, column: 4, clientX: 10 + 80 + 40, clientY: 20 + 60 + 10 },
    ]);
  });

  it('opens the same menu for Shift+F10, which has no entry in the plain key map', () => {
    canvasEl.dispatchEvent(keyDown('F10', { shiftKey: true }));

    expect(fixture.componentInstance.rightClickEvents).toEqual([
      { row: 3, column: 4, clientX: 130, clientY: 90 },
    ]);
  });

  it('suppresses the browser default of Shift+F10, which would open the native menu', () => {
    const event = keyDown('F10', { shiftKey: true });
    canvasEl.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does not open a menu when the selected cell is scrolled out of view', () => {
    gridSurface.selectedCellRect.mockReturnValue(null);

    canvasEl.dispatchEvent(keyDown('ContextMenu'));

    expect(fixture.componentInstance.rightClickEvents).toEqual([]);
  });

  it('bumps the selection version after a navigation key, so the cell actions button follows', () => {
    canvasEl.dispatchEvent(keyDown('ArrowDown'));

    expect(gridSurface.notifySelectionChanged).toHaveBeenCalled();
  });

  it('bumps the selection version when a mouseup closes a rubber band selection', () => {
    gridSurface.notifySelectionChanged.mockClear();

    canvasEl.dispatchEvent(createMouseEvent('mouseup', { clientX: 30, clientY: 40 } as any));

    expect(gridSurface.notifySelectionChanged).toHaveBeenCalledTimes(1);
  });
});
