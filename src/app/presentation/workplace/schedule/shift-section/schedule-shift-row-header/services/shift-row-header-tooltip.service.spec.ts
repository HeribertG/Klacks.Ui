// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ShiftRowHeaderTooltipService } from './shift-row-header-tooltip.service';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { QualificationBubbleTooltipService } from '../../../shared/qualification-bubbles/qualification-bubble-tooltip.service';

const CELL_HEIGHT = 30;
const CANVAS_WIDTH = 200;
const FIRST_VISIBLE_ROW = 2;
const MARKER_TOOLTIP_KEY = 'scenarioVariant.marker.tooltip';
const NEAR_CORNER = { x: 2, y: 2 };
const FAR_FROM_CORNER = { x: 150, y: 15 };

describe('ShiftRowHeaderTooltipService - key marker', () => {
  let tooltip: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let variantRows: Set<number>;
  let service: ShiftRowHeaderTooltipService;
  let canvas: HTMLCanvasElement;

  const hover = (pos: { x: number; y: number }, rowOffset = 0): boolean =>
    service.checkVariantMarkerTooltip(
      { clientX: 40, clientY: 50 } as MouseEvent,
      { x: pos.x, y: pos.y + rowOffset * CELL_HEIGHT },
      canvas,
    );

  beforeEach(() => {
    tooltip = { show: vi.fn(), hide: vi.fn() };
    variantRows = new Set<number>([FIRST_VISIBLE_ROW]);
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: CANVAS_WIDTH } as DOMRect);

    TestBed.configureTestingModule({
      providers: [
        ShiftRowHeaderTooltipService,
        { provide: TooltipService, useValue: tooltip },
        {
          provide: BaseDataService,
          useValue: { rows: 10, getShiftIsVariant: (row: number) => variantRows.has(row) },
        },
        { provide: BaseSettingsService, useValue: { cellHeight: CELL_HEIGHT, zoom: 1 } },
        { provide: ScrollService, useValue: { verticalScrollPosition: FIRST_VISIBLE_ROW } },
        { provide: QualificationBubbleTooltipService, useValue: {} },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
    service = TestBed.inject(ShiftRowHeaderTooltipService);
  });

  it('shows the translated explanation of a key shift next to the cursor when it hovers the marker', () => {
    expect(hover(NEAR_CORNER)).toBe(true);

    expect(tooltip.show).toHaveBeenCalledWith({ text: MARKER_TOOLTIP_KEY, x: 40, y: 50 });
  });

  it('shows nothing away from the marker', () => {
    expect(hover(FAR_FROM_CORNER)).toBe(false);

    expect(tooltip.show).not.toHaveBeenCalled();
  });

  it('shows nothing on a row of a real shift', () => {
    expect(hover(NEAR_CORNER, 1)).toBe(false);

    expect(tooltip.show).not.toHaveBeenCalled();
  });

  it('shows nothing below the last row', () => {
    expect(hover(NEAR_CORNER, 20)).toBe(false);

    expect(tooltip.show).not.toHaveBeenCalled();
  });

  it('shows nothing without a canvas', () => {
    expect(
      service.checkVariantMarkerTooltip({ clientX: 0, clientY: 0 } as MouseEvent, NEAR_CORNER, undefined),
    ).toBe(false);
  });
});
