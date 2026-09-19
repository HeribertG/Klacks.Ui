// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
      isGroupAvailable: vi.fn().mockReturnValue(false),
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

  it('on non-Mac: Ctrl+Click keeps clearing the cell (value false)', () => {
    setPlatform('Win32');
    canvasEl.dispatchEvent(mouse('mousedown', { button: 0, buttons: 1, ctrlKey: true }));

    expect(dataManagement.setHourRange).toHaveBeenCalledWith('c1', '2026-01-01', 0, 1, false);
  });

  it('prevents the native context menu without changing cells', () => {
    const event = mouse('contextmenu', { button: 2 });
    canvasEl.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
  });
});
