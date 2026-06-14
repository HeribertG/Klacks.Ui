// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for managing tooltip display of the shift row header qualification bubbles.
 * Recomputes the same bubble geometry as the renderer to hit-test the hovered emoji and
 * delegates the localized label and overflow text to QualificationBubbleTooltipService.
 * @param tooltipService - Global tooltip service for show/hide
 * @param dataService - Grid data (cast to ShiftDataService for shift lookups)
 * @param settings - Grid settings (cell height, zoom)
 * @param scroll - Vertical scroll position of the shift grid
 * @param bubbleTooltip - Shared qualification bubble hit-testing and label builder
 */
import { inject, Injectable } from '@angular/core';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ShiftDataService } from '../../services/shift-data.service';
import { QualificationBubbleTooltipService } from '../../../shared/qualification-bubbles/qualification-bubble-tooltip.service';
import {
  computeShiftBubbleReserves,
  computeShiftQualificationBubbleLayout,
} from './shift-qualification-bubble-layout';

@Injectable()
export class ShiftRowHeaderTooltipService {
  private tooltipService = inject(TooltipService);
  private dataService = inject(BaseDataService);
  private settings = inject(BaseSettingsService);
  private scroll = inject(ScrollService);
  private bubbleTooltip = inject(QualificationBubbleTooltipService);

  private get shiftData(): ShiftDataService {
    return this.dataService as ShiftDataService;
  }

  hide(): void {
    this.tooltipService.hide();
  }

  checkQualificationTooltip(
    event: MouseEvent,
    pos: { x: number; y: number },
    canvas: HTMLCanvasElement | undefined,
  ): boolean {
    if (!canvas) return false;

    const cellHeight = this.settings.cellHeight;
    const rowOffset = Math.floor(pos.y / cellHeight);
    const row = rowOffset + this.scroll.verticalScrollPosition;
    if (row < 0 || row >= this.shiftData.rows) return false;

    const qualifications = this.shiftData.getShiftQualifications(row);
    if (qualifications.length === 0) return false;

    const localY = pos.y - rowOffset * cellHeight;

    const isRtl = document.documentElement.dir === 'rtl';
    const { iconReserve, anchorReserve } = computeShiftBubbleReserves(
      this.settings.zoom,
      this.shiftData.getShiftIsSporadic(row),
    );

    const layout = computeShiftQualificationBubbleLayout({
      qualifications,
      cellWidth: canvas.getBoundingClientRect().width,
      cellHeight,
      zoom: this.settings.zoom,
      isRtl,
      iconReserve,
      anchorReserve,
    });
    if (layout.bubbles.length === 0) return false;

    const hovered = this.bubbleTooltip.findHoveredBubble(
      layout.bubbles,
      pos.x,
      localY,
      layout.diameter,
    );
    if (!hovered) return false;

    const tooltipText = this.bubbleTooltip.buildTooltipText(
      hovered,
      qualifications,
      layout.bubbles,
    );
    if (!tooltipText) return false;

    this.tooltipService.show({
      text: tooltipText,
      x: event.clientX,
      y: event.clientY,
    });
    return true;
  }
}
