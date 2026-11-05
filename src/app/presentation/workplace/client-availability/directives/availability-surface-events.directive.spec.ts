// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { AvailabilitySurfaceEventsDirective } from './availability-surface-events.directive';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { AvailabilityCanvasManagerService } from '../services/availability-canvas-manager.service';
import { AvailabilityCalculationService } from '../services/render-availability-grid/availability-calculation.service';
import { RenderAvailabilityGridService } from '../services/render-availability-grid';
import { DrawAvailabilityGridService } from '../services/draw-availability-grid.service';
import { AvailabilitySelectionService } from '../services/availability-selection.service';
import { ClientAvailabilitySurfaceComponent } from '../client-availability-surface/client-availability-surface.component';
import { AvailabilityCoordinateService } from '../services/availability-coordinate.service';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { AvailabilityEditService } from '../services/availability-edit.service';

@Component({
  standalone: true,
  imports: [AvailabilitySurfaceEventsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas appAvailabilitySurfaceEvents></canvas>`,
})
class HostComponent {}

let authorization: { isAuthorised: boolean };

beforeEach(() => {
  authorization = { isAuthorised: true };
});

describe('AvailabilitySurfaceEventsDirective - Ctrl+Click and context menu', () => {
  let fixture: ComponentFixture<HostComponent>;
  let canvasEl: HTMLCanvasElement;
  let dataManagement: any;
  let drawGrid: any;

  const setPlatform = (platform: string): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  };

  const mouse = (type: string, init: MouseEventInit): MouseEvent =>
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 10, clientY: 30, ...init });

  beforeEach(async () => {
    dataManagement = {
      setHourRange: vi.fn(),
      getNextGroupValue: vi.fn().mockReturnValue(true),
    };
    drawGrid = {
      drawGrid: vi.fn(),
      getScrollY: vi.fn().mockReturnValue(0),
      getScrollX: vi.fn().mockReturnValue(0),
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AvailabilitySettingService, useValue: { cellHeaderHeight: 20, cellHeight: 20, cellWidth: 20 } },
        { provide: AvailabilityCanvasManagerService, useValue: {} },
        {
          provide: AvailabilityCalculationService,
          useValue: {
            totalColumns: 10,
            columnToDateHour: vi.fn().mockReturnValue({ dateString: '2026-01-01', startHour: 0, endHour: 1 }),
          },
        },
        { provide: RenderAvailabilityGridService, useValue: { getClients: vi.fn().mockReturnValue([{ id: 'c1' }, { id: 'c2' }]) } },
        { provide: DataManagementClientAvailabilityService, useValue: dataManagement },
        { provide: DrawAvailabilityGridService, useValue: drawGrid },
        { provide: AvailabilitySelectionService, useValue: { select: vi.fn() } },
        { provide: ClientAvailabilitySurfaceComponent, useValue: {} },
        AvailabilityEditService,
        { provide: AuthorizationService, useValue: authorization },
        { provide: AvailabilityCoordinateService, useValue: { mouseToColumn: vi.fn().mockReturnValue(0) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}),
    });
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('on Mac: Ctrl+Click does not change any cell', () => {
    setPlatform('MacIntel');
    canvasEl.dispatchEvent(mouse('mousedown', { button: 0, buttons: 1, ctrlKey: true }));

    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
  });

  it('on Mac: a plain click still changes the cell', () => {
    setPlatform('MacIntel');
    canvasEl.dispatchEvent(mouse('mousedown', { button: 0, buttons: 1 }));

    expect(dataManagement.setHourRange).toHaveBeenCalledTimes(1);
  });

  it('on non-Mac: Ctrl+Click erases the cell back to no entry (value null)', () => {
    setPlatform('Win32');
    canvasEl.dispatchEvent(mouse('mousedown', { button: 0, buttons: 1, ctrlKey: true }));

    expect(dataManagement.setHourRange).toHaveBeenCalledWith('c1', '2026-01-01', 0, 1, null);
  });

  it('prevents the native context menu without changing cells', () => {
    const event = mouse('contextmenu', { button: 2 });
    canvasEl.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
  });
});

describe('AvailabilitySurfaceEventsDirective - touch predicate and pan', () => {
  let fixture: ComponentFixture<HostComponent>;
  let directive: AvailabilitySurfaceEventsDirective;
  let selection: any;
  let drawGrid: any;
  let surface: any;

  const pointer = (clientX: number, clientY: number): PointerEvent =>
    new PointerEvent('pointerdown', { pointerType: 'touch', clientX, clientY });

  beforeEach(async () => {
    selection = { selectedRow: vi.fn().mockReturnValue(-1), selectedCol: vi.fn().mockReturnValue(-1), select: vi.fn() };
    drawGrid = {
      drawGrid: vi.fn(),
      moveGrid: vi.fn(),
      getScrollX: vi.fn().mockReturnValue(100),
      getScrollY: vi.fn().mockReturnValue(100),
      getMaxScrollX: vi.fn().mockReturnValue(1000),
      getMaxScrollY: vi.fn().mockReturnValue(1000),
      getVisibleWidth: vi.fn().mockReturnValue(200),
      getVisibleHeight: vi.fn().mockReturnValue(200),
    };
    surface = { notifyScrollChanged: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AvailabilitySettingService, useValue: { cellHeaderHeight: 20, cellHeight: 20, cellWidth: 20 } },
        { provide: AvailabilityCanvasManagerService, useValue: {} },
        { provide: AvailabilityCalculationService, useValue: { totalColumns: 10, columnToDateHour: vi.fn().mockReturnValue({ dateString: '2026-01-01', startHour: 0, endHour: 1 }) } },
        { provide: RenderAvailabilityGridService, useValue: { getClients: vi.fn().mockReturnValue(Array.from({ length: 10 }, (_, index) => ({ id: `c${index}` }))) } },
        { provide: DataManagementClientAvailabilityService, useValue: { setHourRange: vi.fn(), getNextGroupValue: vi.fn().mockReturnValue(true) } },
        { provide: DrawAvailabilityGridService, useValue: drawGrid },
        { provide: AvailabilitySelectionService, useValue: selection },
        { provide: ClientAvailabilitySurfaceComponent, useValue: surface },
        AvailabilityEditService,
        { provide: AuthorizationService, useValue: authorization },
        { provide: AvailabilityCoordinateService, useValue: { mouseToColumn: vi.fn().mockReturnValue(3) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    const canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}),
    });
    fixture.detectChanges();
    directive = fixture.debugElement
      .query((node) => node.name === 'canvas')
      .injector.get(AvailabilitySurfaceEventsDirective);
  });

  afterEach(() => vi.restoreAllMocks());

  it('reports no selection hit while nothing is selected, so the gesture becomes a pan', () => {
    expect(directive.isPointerOnSelection(pointer(70, 30))).toBe(false);
  });

  it('reports a selection hit on the cell that is currently selected', () => {
    selection.selectedRow.mockReturnValue(5);
    selection.selectedCol.mockReturnValue(3);

    expect(directive.isPointerOnSelection(pointer(70, 30))).toBe(true);
  });

  it('reports no selection hit on a neighbouring row', () => {
    selection.selectedRow.mockReturnValue(4);
    selection.selectedCol.mockReturnValue(3);

    expect(directive.isPointerOnSelection(pointer(70, 30))).toBe(false);
  });

  it('reports no selection hit outside the grid rows', () => {
    selection.selectedRow.mockReturnValue(5);
    selection.selectedCol.mockReturnValue(3);

    expect(directive.isPointerOnSelection(pointer(70, 400))).toBe(false);
  });

  it('pans the grid against the finger direction and reports the new scroll position', () => {
    directive.panBy(-30, -40);

    expect(drawGrid.moveGrid).toHaveBeenCalledWith(130, 140);
    expect(surface.notifyScrollChanged).toHaveBeenCalledTimes(1);
  });

  it('clamps a pan at the start of the grid', () => {
    directive.panBy(500, 500);

    expect(drawGrid.moveGrid).toHaveBeenCalledWith(0, 0);
  });

  it('clamps a pan at the end of the grid', () => {
    directive.panBy(-5000, -5000);

    expect(drawGrid.moveGrid).toHaveBeenCalledWith(800, 800);
  });
});

describe('AvailabilitySurfaceEventsDirective - drag painting', () => {
  let fixture: ComponentFixture<HostComponent>;
  let canvasEl: HTMLCanvasElement;
  let dataManagement: any;
  let coord: any;

  const CENTER = 100;
  const DRAG_COLUMNS = [2, 3, 4];

  const mouse = (type: string, init: MouseEventInit = {}): MouseEvent =>
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX: CENTER, clientY: CENTER, ...init });

  const dragAcrossColumns = (downInit: MouseEventInit): void => {
    const [first, ...rest] = DRAG_COLUMNS;
    coord.mouseToColumn.mockReturnValue(first);
    canvasEl.dispatchEvent(mouse('mousedown', { button: 0, buttons: 1, ...downInit }));
    for (const column of rest) {
      coord.mouseToColumn.mockReturnValue(column);
      canvasEl.dispatchEvent(mouse('mousemove', { buttons: 1 }));
    }
    canvasEl.dispatchEvent(mouse('mouseup'));
  };

  beforeEach(async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    dataManagement = {
      setHourRange: vi.fn(),
      getNextGroupValue: vi.fn().mockReturnValue(false),
    };
    coord = { mouseToColumn: vi.fn().mockReturnValue(DRAG_COLUMNS[0]) };

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AvailabilitySettingService, useValue: { cellHeaderHeight: 20, cellHeight: 20, cellWidth: 20 } },
        { provide: AvailabilityCanvasManagerService, useValue: {} },
        {
          provide: AvailabilityCalculationService,
          useValue: {
            totalColumns: 10,
            columnToDateHour: vi.fn((col: number) => ({ dateString: '2026-01-01', startHour: col * 2, endHour: col * 2 + 2 })),
          },
        },
        { provide: RenderAvailabilityGridService, useValue: { getClients: vi.fn().mockReturnValue(Array.from({ length: 10 }, (_, index) => ({ id: `c${index}` }))) } },
        { provide: DataManagementClientAvailabilityService, useValue: dataManagement },
        { provide: DrawAvailabilityGridService, useValue: { drawGrid: vi.fn(), getScrollY: vi.fn().mockReturnValue(0), getScrollX: vi.fn().mockReturnValue(0) } },
        { provide: AvailabilitySelectionService, useValue: { select: vi.fn() } },
        { provide: ClientAvailabilitySurfaceComponent, useValue: {} },
        AvailabilityEditService,
        { provide: AuthorizationService, useValue: authorization },
        { provide: AvailabilityCoordinateService, useValue: coord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}),
    });
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('Ctrl-drag erases every passed cell to no entry (null)', () => {
    dragAcrossColumns({ ctrlKey: true });

    expect(dataManagement.getNextGroupValue).not.toHaveBeenCalled();
    expect(dataManagement.setHourRange.mock.calls).toEqual([
      ['c4', '2026-01-01', 4, 6, null],
      ['c4', '2026-01-01', 6, 8, null],
      ['c4', '2026-01-01', 8, 10, null],
    ]);
  });

  it('a normal drag paints the next state of the first cell onto every passed cell', () => {
    dragAcrossColumns({});

    expect(dataManagement.getNextGroupValue).toHaveBeenCalledTimes(1);
    expect(dataManagement.getNextGroupValue).toHaveBeenCalledWith('c4', '2026-01-01', 4, 6);
    expect(dataManagement.setHourRange.mock.calls).toEqual([
      ['c4', '2026-01-01', 4, 6, false],
      ['c4', '2026-01-01', 6, 8, false],
      ['c4', '2026-01-01', 8, 10, false],
    ]);
  });

  it('a normal drag can paint the erase step (null) when the first cell is the next one to clear', () => {
    dataManagement.getNextGroupValue.mockReturnValue(null);

    dragAcrossColumns({});

    expect(dataManagement.setHourRange.mock.calls.map((call: unknown[]) => call[4])).toEqual([null, null, null]);
  });
});

describe('AvailabilitySurfaceEventsDirective - mixed cell tooltip', () => {
  let fixture: ComponentFixture<HostComponent>;
  let canvasEl: HTMLCanvasElement;
  let dataManagement: any;
  let tooltipService: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

  const POINTER_X = 70;
  const POINTER_Y = 50;

  const mouse = (type: string, init: MouseEventInit = {}): MouseEvent =>
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX: POINTER_X, clientY: POINTER_Y, ...init });

  const hoverMixedCell = (): void => {
    dataManagement.getGroupDisplayState.mockReturnValue(AvailabilityDisplayState.Mixed);
    canvasEl.dispatchEvent(mouse('mousemove'));
  };

  beforeEach(async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    dataManagement = {
      setHourRange: vi.fn(),
      getNextGroupValue: vi.fn().mockReturnValue(true),
      getGroupDisplayState: vi.fn().mockReturnValue(AvailabilityDisplayState.Available),
      getGroupHourDisplayStates: vi.fn().mockReturnValue([
        { hour: 6, state: AvailabilityDisplayState.Blocked },
        { hour: 7, state: AvailabilityDisplayState.Available },
      ]),
    };
    tooltipService = { show: vi.fn(), hide: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AvailabilitySettingService, useValue: { cellHeaderHeight: 20, cellHeight: 20, cellWidth: 20 } },
        { provide: AvailabilityCanvasManagerService, useValue: {} },
        {
          provide: AvailabilityCalculationService,
          useValue: { totalColumns: 10, columnToDateHour: vi.fn().mockReturnValue({ dateString: '2026-01-01', startHour: 6, endHour: 8 }) },
        },
        { provide: RenderAvailabilityGridService, useValue: { getClients: vi.fn().mockReturnValue([{ id: 'c1' }, { id: 'c2' }]) } },
        { provide: DataManagementClientAvailabilityService, useValue: dataManagement },
        {
          provide: DrawAvailabilityGridService,
          useValue: {
            drawGrid: vi.fn(),
            moveGrid: vi.fn(),
            getScrollX: vi.fn().mockReturnValue(0),
            getScrollY: vi.fn().mockReturnValue(0),
            getMaxScrollX: vi.fn().mockReturnValue(1000),
            getMaxScrollY: vi.fn().mockReturnValue(1000),
            getVisibleWidth: vi.fn().mockReturnValue(200),
            getVisibleHeight: vi.fn().mockReturnValue(200),
          },
        },
        { provide: AvailabilitySelectionService, useValue: { select: vi.fn() } },
        { provide: ClientAvailabilitySurfaceComponent, useValue: { notifyScrollChanged: vi.fn() } },
        AvailabilityEditService,
        { provide: AuthorizationService, useValue: authorization },
        { provide: AvailabilityCoordinateService, useValue: { mouseToColumn: vi.fn().mockReturnValue(3) } },
        { provide: TooltipService, useValue: tooltipService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}),
    });
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows every hour of a mixed cell with its state label at the pointer', () => {
    hoverMixedCell();

    expect(dataManagement.getGroupHourDisplayStates).toHaveBeenCalledWith('c2', '2026-01-01', 6, 8);
    expect(tooltipService.show).toHaveBeenCalledWith({
      text: '06:00 client-availability.legend.blocked\n07:00 client-availability.legend.available',
      x: POINTER_X,
      y: POINTER_Y,
    });
  });

  it('stays quiet on a uniform cell', () => {
    canvasEl.dispatchEvent(mouse('mousemove'));

    expect(tooltipService.show).not.toHaveBeenCalled();
    expect(tooltipService.hide).not.toHaveBeenCalled();
    expect(dataManagement.getGroupHourDisplayStates).not.toHaveBeenCalled();
  });

  it('hides the tooltip when the pointer moves from a mixed cell onto a uniform cell', () => {
    hoverMixedCell();
    dataManagement.getGroupDisplayState.mockReturnValue(AvailabilityDisplayState.Available);
    canvasEl.dispatchEvent(mouse('mousemove'));

    expect(tooltipService.hide).toHaveBeenCalledTimes(1);
  });

  it('hides the tooltip when the pointer leaves the canvas', () => {
    hoverMixedCell();
    canvasEl.dispatchEvent(new MouseEvent('mouseleave'));

    expect(tooltipService.hide).toHaveBeenCalledTimes(1);
  });

  it('hides the tooltip on a wheel scroll', () => {
    hoverMixedCell();
    canvasEl.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, cancelable: true }));

    expect(tooltipService.hide).toHaveBeenCalledTimes(1);
  });

  it('hides the tooltip when a drag starts and shows none while dragging over mixed cells', () => {
    hoverMixedCell();
    canvasEl.dispatchEvent(mouse('mousedown', { button: 0, buttons: 1 }));
    expect(tooltipService.hide).toHaveBeenCalledTimes(1);

    tooltipService.show.mockClear();
    canvasEl.dispatchEvent(mouse('mousemove', { buttons: 1 }));
    canvasEl.dispatchEvent(mouse('mouseup'));

    expect(tooltipService.show).not.toHaveBeenCalled();
  });
});

describe('AvailabilitySurfaceEventsDirective - edit right and Delete key', () => {
  let canvasEl: HTMLCanvasElement;
  let dataManagement: any;
  let selection: any;

  const SELECTED_ROW = 1;
  const SELECTED_COL = 3;

  const keydown = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    canvasEl.dispatchEvent(event);
    return event;
  };

  beforeEach(async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    dataManagement = {
      setHourRange: vi.fn(),
      toggleAvailability: vi.fn(),
      getNextGroupValue: vi.fn().mockReturnValue(true),
      getGroupDisplayState: vi.fn().mockReturnValue(AvailabilityDisplayState.Available),
    };
    selection = {
      selectedRow: signal(SELECTED_ROW),
      selectedCol: signal(SELECTED_COL),
      hasSelection: vi.fn().mockReturnValue(true),
      select: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AvailabilitySettingService, useValue: { cellHeaderHeight: 20, cellHeight: 20, cellWidth: 20 } },
        { provide: AvailabilityCanvasManagerService, useValue: {} },
        {
          provide: AvailabilityCalculationService,
          useValue: { totalColumns: 10, columnToDateHour: vi.fn().mockReturnValue({ dateString: '2026-01-01', startHour: 6, endHour: 8 }) },
        },
        { provide: RenderAvailabilityGridService, useValue: { getClients: vi.fn().mockReturnValue([{ id: 'c1' }, { id: 'c2' }]) } },
        { provide: DataManagementClientAvailabilityService, useValue: dataManagement },
        { provide: DrawAvailabilityGridService, useValue: { drawGrid: vi.fn(), getScrollX: vi.fn().mockReturnValue(0), getScrollY: vi.fn().mockReturnValue(0) } },
        { provide: AvailabilitySelectionService, useValue: selection },
        { provide: ClientAvailabilitySurfaceComponent, useValue: {} },
        AvailabilityEditService,
        { provide: AuthorizationService, useValue: authorization },
        { provide: AvailabilityCoordinateService, useValue: { mouseToColumn: vi.fn().mockReturnValue(SELECTED_COL) } },
        { provide: TooltipService, useValue: { show: vi.fn(), hide: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HostComponent);
    canvasEl = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(canvasEl, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}),
    });
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('Delete clears all 24 hours of the selected client day to no entry', () => {
    const event = keydown('Delete');

    expect(dataManagement.setHourRange).toHaveBeenCalledTimes(1);
    expect(dataManagement.setHourRange).toHaveBeenCalledWith('c2', '2026-01-01', 0, 24, null);
    expect(event.defaultPrevented).toBe(true);
  });

  it('Delete does nothing without the edit right', () => {
    authorization.isAuthorised = false;

    keydown('Delete');

    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
  });

  it('a click without the edit right only selects the cell', () => {
    authorization.isAuthorised = false;

    canvasEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: 70, clientY: 50 }));

    expect(selection.select).toHaveBeenCalledWith(SELECTED_ROW, SELECTED_COL);
    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
    expect(dataManagement.getNextGroupValue).not.toHaveBeenCalled();
  });

  it('Space without the edit right does not toggle the selected cell', () => {
    authorization.isAuthorised = false;

    keydown(' ');

    expect(dataManagement.toggleAvailability).not.toHaveBeenCalled();
  });

  it('Space with the edit right toggles the selected cell', () => {
    keydown(' ');

    expect(dataManagement.toggleAvailability).toHaveBeenCalledWith('c2', '2026-01-01', 6, 8);
  });
});
