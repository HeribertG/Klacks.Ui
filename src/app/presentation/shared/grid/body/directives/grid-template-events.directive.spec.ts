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
