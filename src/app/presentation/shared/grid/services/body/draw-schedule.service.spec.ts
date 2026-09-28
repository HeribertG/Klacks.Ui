// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BaseDrawScheduleService } from './draw-schedule.service';
import { BaseCellManipulationService } from './cell-manipulation.service';
import { BaseCanvasManagerService } from './canvas-manager.service';
import { BaseCellRenderService } from './cell-render.service';
import { BaseGridRenderService } from './grid-render.service';
import { BaseCreateCellService } from './create-cell.service';
import { BaseCreateHeaderService } from './create-header.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridCoordinateService } from 'src/app/presentation/shared/grid/services/grid-coordinate.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { GridFontsService } from '../grid-fonts.service';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';

describe('BaseDrawScheduleService selection overlay', () => {
  let service: BaseDrawScheduleService;
  let gridRender: {
    renderGrid: ReturnType<typeof vi.fn>;
    drawGridSelectedCell: ReturnType<typeof vi.fn>;
    drawSelection: ReturnType<typeof vi.fn>;
    drawGridSelectedHeaderCell: ReturnType<typeof vi.fn>;
  };
  let positionCollection: { count: ReturnType<typeof vi.fn>; getAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    gridRender = {
      renderGrid: vi.fn(),
      drawGridSelectedCell: vi.fn(),
      drawSelection: vi.fn(),
      drawGridSelectedHeaderCell: vi.fn(),
    };
    positionCollection = { count: vi.fn().mockReturnValue(0), getAll: vi.fn().mockReturnValue([]) };

    TestBed.configureTestingModule({
      providers: [
        BaseDrawScheduleService,
        { provide: BaseGridRenderService, useValue: gridRender },
        {
          provide: BaseCellManipulationService,
          useValue: { Position: new MyPosition(0, 1), PositionCollection: positionCollection },
        },
        { provide: BaseCanvasManagerService, useValue: { isCanvasAvailable: () => true } },
        { provide: BaseCellRenderService, useValue: {} },
        { provide: BaseCreateCellService, useValue: {} },
        { provide: BaseCreateHeaderService, useValue: {} },
        { provide: BaseDataService, useValue: { rows: 10, columns: 10 } },
        { provide: BaseSettingsService, useValue: {} },
        { provide: GridCoordinateService, useValue: {} },
        { provide: GridColorService, useValue: {} },
        { provide: ScrollService, useValue: { verticalScrollPosition: 0, horizontalScrollPosition: 0 } },
        { provide: GridFontsService, useValue: {} },
      ],
    });
    service = TestBed.inject(BaseDrawScheduleService);
  });

  function expectFreshBodyBeforeEveryOverlay(): void {
    const overlays = gridRender.drawGridSelectedCell.mock.invocationCallOrder;
    const bodies = gridRender.renderGrid.mock.invocationCallOrder;
    expect(overlays.length).toBeGreaterThan(0);
    let previous = 0;
    for (const overlay of overlays) {
      expect(bodies.some((body) => body > previous && body < overlay)).toBe(true);
      previous = overlay;
    }
  }

  it('redraws the body before each selected-cell overlay, so repeated calls never stack the translucent row', () => {
    service.drawGridSelectedCell();
    service.drawGridSelectedCell();
    service.drawGridSelectedCell();

    expect(gridRender.drawGridSelectedCell).toHaveBeenCalledTimes(3);
    expectFreshBodyBeforeEveryOverlay();
  });

  it('redraws the body before the overlay when the selection is drawn after a context menu', () => {
    service.drawSelection();
    service.drawGridSelectedCell();

    expectFreshBodyBeforeEveryOverlay();
  });
});
