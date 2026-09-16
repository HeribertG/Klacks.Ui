// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbsenceCalendarDirective } from './absence-calendar.directive';
import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { DrawCalendarGanttService } from 'src/app/presentation/workplace/absence-gantt/services/draw-calendar-gantt.service';

const createMouseEvent = (
  type: string,
  init: Partial<MouseEvent> & { offsetY?: number } = {}
): MouseEvent => {
  const { offsetY, ...rest } = init;
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...rest });
  if (offsetY !== undefined) {
    Object.defineProperty(event, 'offsetY', { value: offsetY });
  }
  return event;
};

describe('AbsenceCalendarDirective - Safari right-click via contextmenu', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let canvasEl: HTMLElement;
  let contextMenu: any;
  let gridBody: any;

  @Component({
    standalone: true,
    imports: [AbsenceCalendarDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appAbsenceCalendar></canvas>`,
  })
  class TestHostComponent {}

  beforeEach(async () => {
    contextMenu = {
      closeMenu: vi.fn(),
      openMenu: vi.fn(),
    };

    gridBody = {
      drawCalendarGantt: { isFocused: false, rows: 5, selectedRow: 0, isBusy: false },
      dataManagementBreak: { canReadBreaks: true, rows: 5 },
      calendarSetting: { cellHeaderHeight: 20, cellHeight: 20 },
      scroll: { verticalScrollPosition: 0, visibleRows: 5, maxRows: 5 },
      isCtrl: false,
      onSelectByMouse: vi.fn(),
      onMouseDown: vi.fn(),
      onMouseUp: vi.fn(),
      onMouseMove: vi.fn(),
      setFocus: vi.fn(),
      destroyToolTip: vi.fn(),
      showToolTip: vi.fn(),
      hideToolTip: vi.fn(),
      calcCorrectCoordinate: vi.fn().mockReturnValue({ column: 0, row: 0 }),
      holidayInfo: vi.fn().mockReturnValue(null),
      setShiftKey: vi.fn(),
      unSetShiftKey: vi.fn(),
      createContextMenu: vi.fn(),
      contextMenu: vi.fn().mockReturnValue(contextMenu),
      valueHScrollbar: { emit: vi.fn() },
      valueVScrollbar: { emit: vi.fn() },
      valueChangeHScrollbar: vi.fn().mockReturnValue(0),
      valueChangeVScrollbar: vi.fn().mockReturnValue(0),
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: AbsenceGanttSurfaceComponent, useValue: gridBody },
        { provide: DrawCalendarGanttService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  });

  it('does not open the context menu from a plain mousedown with buttons=2', () => {
    canvasEl.dispatchEvent(createMouseEvent('mousedown', { buttons: 2 } as any));

    expect(contextMenu.openMenu).not.toHaveBeenCalled();
  });

  it('opens the context menu from the native contextmenu event', () => {
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 5, clientY: 5, offsetY: 30 } as any));

    expect(gridBody.createContextMenu).toHaveBeenCalled();
    expect(contextMenu.openMenu).toHaveBeenCalled();
  });

  it('reproduces the Safari Ctrl+Click sequence: mousedown fires as button 0, contextmenu still opens the menu', () => {
    canvasEl.dispatchEvent(
      createMouseEvent('mousedown', { buttons: 1, ctrlKey: true } as any)
    );
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 5, clientY: 5, offsetY: 30 } as any));

    expect(contextMenu.openMenu).toHaveBeenCalled();
  });
});
