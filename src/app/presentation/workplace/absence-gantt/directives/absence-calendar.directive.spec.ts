// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbsenceCalendarDirective } from './absence-calendar.directive';
import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { DrawCalendarGanttService } from 'src/app/presentation/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { LongPressContextDirective } from 'src/app/presentation/directives/long-press-context.directive';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

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
      cancelDrag: vi.fn(),
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

describe('AbsenceCalendarDirective - Mac Ctrl+Click drag guard', () => {
  let fixture: ComponentFixture<AbsenceMacHostComponent>;
  let canvasEl: HTMLElement;
  let contextMenu: any;
  let gridBody: any;

  @Component({
    selector: 'app-absence-mac-host',
    standalone: true,
    imports: [AbsenceCalendarDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appAbsenceCalendar></canvas>`,
  })
  class AbsenceMacHostComponent {}

  const setPlatform = (platform: string): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  };

  beforeEach(async () => {
    contextMenu = { closeMenu: vi.fn(), openMenu: vi.fn() };
    gridBody = {
      drawCalendarGantt: { isFocused: false, rows: 5 },
      calendarSetting: { cellHeaderHeight: 20 },
      onSelectByMouse: vi.fn(),
      onMouseDown: vi.fn(),
      cancelDrag: vi.fn(),
      setFocus: vi.fn(),
      createContextMenu: vi.fn(),
      contextMenu: vi.fn().mockReturnValue(contextMenu),
    };

    await TestBed.configureTestingModule({
      imports: [AbsenceMacHostComponent],
      providers: [
        { provide: AbsenceGanttSurfaceComponent, useValue: gridBody },
        { provide: DrawCalendarGanttService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AbsenceMacHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('on Mac: Ctrl+Click does not start a drag and contextmenu cancels any drag state', () => {
    setPlatform('MacIntel');
    canvasEl.dispatchEvent(createMouseEvent('mousedown', { button: 0, buttons: 1, ctrlKey: true } as any));

    expect(gridBody.onSelectByMouse).not.toHaveBeenCalled();
    expect(gridBody.onMouseDown).not.toHaveBeenCalled();

    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 5, clientY: 5, offsetY: 30 } as any));

    expect(gridBody.cancelDrag).toHaveBeenCalledTimes(1);
    expect(contextMenu.openMenu).toHaveBeenCalled();
  });

  it('on non-Mac: Ctrl+Click keeps starting the drag path', () => {
    setPlatform('Win32');
    canvasEl.dispatchEvent(createMouseEvent('mousedown', { button: 0, buttons: 1, ctrlKey: true } as any));

    expect(gridBody.onMouseDown).toHaveBeenCalledTimes(1);
  });

  it('on Mac: plain primary click still starts the drag path', () => {
    setPlatform('MacIntel');
    canvasEl.dispatchEvent(createMouseEvent('mousedown', { button: 0, buttons: 1 } as any));

    expect(gridBody.onMouseDown).toHaveBeenCalledTimes(1);
  });
});

describe('AbsenceCalendarDirective - long press opens the context menu', () => {
  let fixture: ComponentFixture<AbsenceLongPressHostComponent>;
  let canvasEl: HTMLElement;
  let contextMenu: any;
  let gridBody: any;

  @Component({
    selector: 'app-absence-long-press-host',
    standalone: true,
    imports: [AbsenceCalendarDirective, LongPressContextDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<canvas appAbsenceCalendar appLongPressContext></canvas>`,
  })
  class AbsenceLongPressHostComponent {}

  const touchPointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 4,
      pointerType: 'touch',
      clientX: 70,
      clientY: 90,
      ...init,
    });

  beforeEach(async () => {
    vi.useFakeTimers();
    contextMenu = { closeMenu: vi.fn(), openMenu: vi.fn() };
    gridBody = {
      drawCalendarGantt: { isFocused: false, rows: 5 },
      calendarSetting: { cellHeaderHeight: 0 },
      onSelectByMouse: vi.fn(),
      onMouseDown: vi.fn(),
      cancelDrag: vi.fn(),
      setFocus: vi.fn(),
      createContextMenu: vi.fn(),
      contextMenu: vi.fn().mockReturnValue(contextMenu),
    };

    await TestBed.configureTestingModule({
      imports: [AbsenceLongPressHostComponent],
      providers: [
        { provide: AbsenceGanttSurfaceComponent, useValue: gridBody },
        { provide: DrawCalendarGanttService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AbsenceLongPressHostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('opens the menu at the finger position after the long-press duration', () => {
    canvasEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(contextMenu.closeMenu).toHaveBeenCalledWith(true);
    expect(gridBody.createContextMenu).toHaveBeenCalled();
    expect(contextMenu.openMenu).toHaveBeenCalledTimes(1);
    const opened = contextMenu.openMenu.mock.calls[0][0] as MouseEvent;
    expect(opened.clientX).toBe(70);
    expect(opened.clientY).toBe(90);
  });

  it('opens the menu only once when the browser adds its own contextmenu afterwards', () => {
    canvasEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(touchPointer('pointerup'));
    canvasEl.dispatchEvent(createMouseEvent('contextmenu', { clientX: 70, clientY: 90 } as any));

    expect(contextMenu.openMenu).toHaveBeenCalledTimes(1);
  });

  it('does not open the menu when the finger lifts before the long-press duration', () => {
    canvasEl.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs - 50);
    document.dispatchEvent(touchPointer('pointerup'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);

    expect(contextMenu.openMenu).not.toHaveBeenCalled();
  });
});
