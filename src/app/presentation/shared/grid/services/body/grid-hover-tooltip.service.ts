// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tracks the grid cell or header column under the pointer and shows the cell tooltip. In touch mode a tooltip
 * opened by a tap hides itself after TouchInteraction.TooltipAutoHideMs, because no mouseleave follows.
 * Provided per grid canvas by GridTemplateEventsDirective.
 * @param el - The grid canvas, used to map client coordinates onto the header row
 * @param gridSurface - GridSurfaceTemplateComponent that renders the tooltip
 * @param gridData - BaseDataService for the column count, cell activity and tooltip text
 * @param gridSettings - BaseSettingsService for header presence and cell size
 * @param scrollGrid - ScrollService for the horizontal scroll offset
 * @param cellManipulation - BaseCellManipulationService holding the hovered cell signal
 * @param inputModality - InputModalityService telling whether the last input was touch
 */
import { ElementRef, Injectable, inject } from '@angular/core';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridSurfaceTemplateComponent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

@Injectable()
export class GridHoverTooltipService {
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private gridSurface = inject(GridSurfaceTemplateComponent);
  private gridData = inject(BaseDataService);
  private gridSettings = inject(BaseSettingsService);
  private scrollGrid = inject(ScrollService);
  private cellManipulation = inject(BaseCellManipulationService);
  private inputModality = inject(InputModalityService);

  private tooltipAutoHideTimer: ReturnType<typeof setTimeout> | null = null;

  hoverHeader(event: MouseEvent): boolean {
    if (!this.gridSettings.hasHeader) {
      return false;
    }

    const rect = this.el.nativeElement.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;

    if (relativeY >= this.gridSettings.cellHeaderHeight) {
      return false;
    }

    const relativeX = event.clientX - rect.left;
    const column = Math.floor(relativeX / this.gridSettings.cellWidth) + this.scrollGrid.horizontalScrollPosition;

    if (column < 0 || column >= this.gridData.columns) {
      this.cellManipulation.hoveredCell.set(null);
      return true;
    }

    this.cellManipulation.hoveredCell.set({
      row: -1,
      column,
      isEmpty: true,
      isHeader: true,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    return true;
  }

  hoverCell(pos: MyPosition, event: MouseEvent): void {
    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      this.cellManipulation.hoveredCell.set(null);
      this.hideToolTipAndCancelAutoHide();
      return;
    }

    const isEmpty = !this.gridData.isCellActive(pos.row, pos.column);
    this.cellManipulation.hoveredCell.set({
      row: pos.row,
      column: pos.column,
      isEmpty,
      isHeader: false,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const cell = this.gridData.getCell(pos.row, pos.column);
    if (cell && cell.tooltip) {
      this.showToolTipForModality(cell.tooltip, event);
    } else {
      this.hideToolTipAndCancelAutoHide();
    }
  }

  destroyToolTip(): void {
    this.cancelTooltipAutoHide();
    this.gridSurface.destroyToolTip();
  }

  cancelTooltipAutoHide(): void {
    if (this.tooltipAutoHideTimer === null) {
      return;
    }
    clearTimeout(this.tooltipAutoHideTimer);
    this.tooltipAutoHideTimer = null;
  }

  private showToolTipForModality(value: string, event: MouseEvent): void {
    this.cancelTooltipAutoHide();
    this.gridSurface.showToolTip({ value, event });
    if (!this.inputModality.isTouchMode()) {
      return;
    }
    this.tooltipAutoHideTimer = setTimeout(() => {
      this.tooltipAutoHideTimer = null;
      this.gridSurface.hideToolTip();
    }, TouchInteraction.TooltipAutoHideMs);
  }

  private hideToolTipAndCancelAutoHide(): void {
    this.cancelTooltipAutoHide();
    this.gridSurface.hideToolTip();
  }
}
