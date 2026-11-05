// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component } from '@angular/core';
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

@Component({
  standalone: true,
  imports: [AvailabilitySurfaceEventsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas appAvailabilitySurfaceEvents></canvas>`,
})
class HostComponent {}

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
      imports: [HostComponent],
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
      imports: [HostComponent],
      providers: [
        { provide: AvailabilitySettingService, useValue: { cellHeaderHeight: 20, cellHeight: 20, cellWidth: 20 } },
        { provide: AvailabilityCanvasManagerService, useValue: {} },
        { provide: AvailabilityCalculationService, useValue: { totalColumns: 10, columnToDateHour: vi.fn().mockReturnValue({ dateString: '2026-01-01', startHour: 0, endHour: 1 }) } },
        { provide: RenderAvailabilityGridService, useValue: { getClients: vi.fn().mockReturnValue(Array.from({ length: 10 }, (_, index) => ({ id: `c${index}` }))) } },
        { provide: DataManagementClientAvailabilityService, useValue: { setHourRange: vi.fn(), getNextGroupValue: vi.fn().mockReturnValue(true) } },
        { provide: DrawAvailabilityGridService, useValue: drawGrid },
        { provide: AvailabilitySelectionService, useValue: selection },
        { provide: ClientAvailabilitySurfaceComponent, useValue: surface },
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
      imports: [HostComponent],
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
