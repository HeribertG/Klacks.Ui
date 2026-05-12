// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Overlay renderer that marks the selected timeline block (Work / WorkChange /
 * Break) with a semi-transparent blue fill plus a dotted blue border. The
 * border extends one pixel beyond each edge of the block. Midnight-split
 * blocks receive the same treatment on both halves.
 * @param selection - Provides the active selection
 * @param hitTest - Reused for block-range math and midnight detection
 * @param settings - Grid settings for cell dimensions
 * @param scroll - Current scroll offsets for viewport-relative drawing
 * @param coord - RTL-aware column to pixel translation
 * @param canvasManager - Access to the visible canvas dimensions
 * @param gridColors - Provides the focus border color (matches table selection)
 * @param gridData - Total column count for overflow visibility checks
 */
import { Injectable, inject } from '@angular/core';
import { BaseCanvasManagerService } from 'src/app/presentation/shared/grid/services/body/canvas-manager.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridCoordinateService } from 'src/app/presentation/shared/grid/services/grid-coordinate.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { TimelineBlockHitTestService } from './timeline-block-hit-test.service';
import { TimelineSelectionService } from './timeline-selection.service';

const BORDER_WIDTH = 2;
const BORDER_DASH = [0, 4];
const BORDER_OUTSET = 1;
const FILL_ALPHA = 0.25;

interface DrawPartContext {
  row: number;
  col: number;
  yStartInCell: number;
  yEndInCell: number;
  firstVisibleRow: number;
  firstVisibleCol: number;
  cellWidth: number;
  cellHeight: number;
  cellHeaderHeight: number;
  sealed: boolean;
}

@Injectable()
export class TimelineSelectionOverlayService {
  private selection = inject(TimelineSelectionService);
  private hitTest = inject(TimelineBlockHitTestService);
  private settings = inject(BaseSettingsService);
  private scroll = inject(ScrollService);
  private coord = inject(GridCoordinateService);
  private canvasManager = inject(BaseCanvasManagerService);
  private gridColors = inject(GridColorService);
  private gridData = inject(BaseDataService);

  public renderSelection(ctx: CanvasRenderingContext2D): void {
    if (!this.settings.isTimelineMode) {
      return;
    }
    const sel = this.selection.selectedBlock();
    if (!sel) {
      return;
    }

    const mainRange = this.hitTest.computeBlockRange(sel.entry, false);
    if (!mainRange) {
      return;
    }

    const firstVisibleRow = this.scroll.verticalScrollPosition;
    const firstVisibleCol = this.scroll.horizontalScrollPosition;
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    const cellHeaderHeight = this.settings.hasHeader ? this.settings.cellHeaderHeight : 0;
    const canvasWidth = this.canvasManager.canvas?.width ?? 0;
    const canvasHeight = this.canvasManager.canvas?.height ?? 0;
    const sealed = sel.entry.lockLevel > 0 || sel.entry.isGroupRestricted;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      0,
      cellHeaderHeight,
      canvasWidth,
      Math.max(0, canvasHeight - cellHeaderHeight),
    );
    ctx.clip();

    this.drawPart(ctx, {
      row: sel.row,
      col: sel.col,
      yStartInCell: mainRange.yStart,
      yEndInCell: mainRange.yEnd,
      firstVisibleRow,
      firstVisibleCol,
      cellWidth,
      cellHeight,
      cellHeaderHeight,
      sealed,
    });

    if (this.hitTest.spansMidnight(sel.entry)) {
      const overflowRange = this.hitTest.computeBlockRange(sel.entry, true);
      const overflowCol = sel.col + 1;
      if (overflowRange && overflowCol < this.gridData.columns) {
        this.drawPart(ctx, {
          row: sel.row,
          col: overflowCol,
          yStartInCell: overflowRange.yStart,
          yEndInCell: overflowRange.yEnd,
          firstVisibleRow,
          firstVisibleCol,
          cellWidth,
          cellHeight,
          cellHeaderHeight,
          sealed,
        });
      }
    }

    ctx.restore();
  }

  private drawPart(ctx: CanvasRenderingContext2D, part: DrawPartContext): void {
    const visibleCol = part.col - part.firstVisibleCol;
    if (visibleCol < 0) {
      return;
    }
    const visibleRow = part.row - part.firstVisibleRow;
    if (visibleRow < 0) {
      return;
    }

    const itemX = this.coord.cellX(visibleCol);
    const itemY = part.cellHeaderHeight + visibleRow * part.cellHeight + part.yStartInCell;
    const itemW = part.cellWidth;
    const itemH = Math.max(1, part.yEndInCell - part.yStartInCell);

    ctx.save();
    ctx.globalAlpha = FILL_ALPHA;
    ctx.fillStyle = this.gridColors.focusBorderColor;
    ctx.fillRect(itemX, itemY, itemW, itemH);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = this.gridColors.focusBorderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.lineCap = part.sealed ? 'butt' : 'round';
    ctx.setLineDash(part.sealed ? [] : BORDER_DASH);
    ctx.strokeRect(
      itemX - BORDER_OUTSET,
      itemY - BORDER_OUTSET,
      itemW + 2 * BORDER_OUTSET,
      itemH + 2 * BORDER_OUTSET,
    );
    ctx.restore();
  }
}
