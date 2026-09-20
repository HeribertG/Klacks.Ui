// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GridFillHandleDragService } from './grid-fill-handle-drag.service';
import { FillHandleService } from './fill-handle.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';

const CELL_WIDTH = 90;
const CELL_HEIGHT = 30;
const SELECTED_POSITION = new MyPosition(0, 0);
const HANDLE_CENTER_X = CELL_WIDTH;
const HANDLE_CENTER_Y = CELL_HEIGHT;
const BETWEEN_BOTH_HIT_AREAS = 18;

describe('GridFillHandleDragService - fill handle hit area per input modality', () => {
  let service: GridFillHandleDragService;
  let isTouchMode: boolean;
  let canvas: HTMLCanvasElement;

  const pointerAtDistance = (distance: number): MouseEvent =>
    new MouseEvent('mousedown', {
      clientX: HANDLE_CENTER_X + distance,
      clientY: HANDLE_CENTER_Y,
    });

  beforeEach(() => {
    isTouchMode = false;
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 900, bottom: 300, width: 900, height: 300, x: 0, y: 0,
      toJSON: () => ({}),
    });

    TestBed.configureTestingModule({
      providers: [
        GridFillHandleDragService,
        { provide: BaseDataService, useValue: { isCellDraggable: vi.fn().mockReturnValue(true) } },
        { provide: BaseSettingsService, useValue: { cellWidth: CELL_WIDTH, cellHeight: CELL_HEIGHT, cellHeaderHeight: 0, zoom: 1 } },
        { provide: ScrollService, useValue: { horizontalScrollPosition: 0, verticalScrollPosition: 0 } },
        { provide: BaseCellManipulationService, useValue: { Position: SELECTED_POSITION, PositionCollection: { count: vi.fn().mockReturnValue(1) } } },
        { provide: FillHandleService, useValue: { isDragging: vi.fn().mockReturnValue(false) } },
        { provide: GridFontsService, useValue: {} },
        { provide: DataManagementScheduleService, useValue: { shiftSchedules: [] } },
        { provide: InputModalityService, useValue: { isTouchMode: () => isTouchMode } },
      ],
    });

    service = TestBed.inject(GridFillHandleDragService);
    service.initialize({
      gridSurface: { drawSchedule: { showFillHandle: true } } as any,
      el: new ElementRef(canvas) as ElementRef<HTMLCanvasElement>,
    });
  });

  it('misses the fill handle with a mouse at a distance only the touch area covers', () => {
    expect(service.isPointerOverFillHandle(pointerAtDistance(BETWEEN_BOTH_HIT_AREAS))).toBe(false);
  });

  it('hits the fill handle with a finger at the same distance', () => {
    isTouchMode = true;

    expect(service.isPointerOverFillHandle(pointerAtDistance(BETWEEN_BOTH_HIT_AREAS))).toBe(true);
  });

  it('hits the fill handle with a mouse inside the mouse hit area', () => {
    expect(
      service.isPointerOverFillHandle(pointerAtDistance(TouchInteraction.FillHandleHitAreaPx - 1)),
    ).toBe(true);
  });

  it('misses the fill handle with a finger beyond the touch hit area', () => {
    isTouchMode = true;

    expect(
      service.isPointerOverFillHandle(
        pointerAtDistance(TouchInteraction.FillHandleTouchHitAreaPx + 1),
      ),
    ).toBe(false);
  });

  it('reports no hit while the grid draws no fill handle', () => {
    isTouchMode = true;
    service.initialize({
      gridSurface: { drawSchedule: { showFillHandle: false } } as any,
      el: new ElementRef(canvas) as ElementRef<HTMLCanvasElement>,
    });

    expect(service.isPointerOverFillHandle(pointerAtDistance(0))).toBe(false);
  });

  it('reports no hit while no cell is selected', () => {
    (TestBed.inject(BaseCellManipulationService) as any).Position = new MyPosition(-1, -1);

    expect(service.isPointerOverFillHandle(pointerAtDistance(0))).toBe(false);
  });
});
