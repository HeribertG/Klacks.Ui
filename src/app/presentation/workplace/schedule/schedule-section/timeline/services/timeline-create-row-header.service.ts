// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Row-header creation for the timeline view.
 * Reuses the full client/info-spot rendering from BaseCreateRowHeaderService
 * and appends a vertical 24-hour ruler on the right side of the cell.
 * @param timeRulerRender - Vertical time-axis renderer, reused from the time-ruler shared module
 * @param tSettings - Grid settings for zoom and cell height
 * @param tData - Grid data source for row-to-client mapping
 */
import { inject, Injectable } from '@angular/core';
import { BaseCreateRowHeaderService } from '../../services/create-row-header.service';
import { GridRowHeader } from '../../../classes/grid-row-header';
import { ClientWork, OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { TimeRulerRenderService } from 'src/app/presentation/shared/time-ruler/services/time-ruler-render.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Injectable()
export class TimelineCreateRowHeaderService extends BaseCreateRowHeaderService {
  private timeRulerRender = inject(TimeRulerRenderService);
  private tSettings = inject(BaseSettingsService);
  private tData = inject(BaseDataService);
  private tColors = inject(GridColorService);

  private readonly dayStart = OwnTime.forTime('00', '00');
  private readonly dayEnd = OwnTime.forTime('24', '00');
  private readonly TIMELINE_RULER_WIDTH = 55;
  private readonly TIMELINE_RULER_BORDER_WIDTH = 1;

  override createCell(row: number, width: number): GridRowHeader | undefined {
    const rulerWidth = this.TIMELINE_RULER_WIDTH;
    const innerWidth = Math.max(0, width - rulerWidth);

    const baseCell = super.createCell(row, innerWidth);
    if (!baseCell || !baseCell.img) {
      return baseCell;
    }

    const clientIndex = this.tData.rowGroupIndex[row];
    const client = this.tData.getGroupIndex(clientIndex) as ClientWork | undefined;
    if (!client) {
      return baseCell;
    }

    const height = this.tSettings.getGroupLineHeight(client.displayRows);
    const composedCanvas = document.createElement('canvas');
    const ctx = DrawHelper.createHiDPICanvas(composedCanvas, width, height, true);
    if (!ctx) {
      return baseCell;
    }

    const isRtl = document.documentElement.dir === 'rtl';
    const rulerX = isRtl ? 0 : innerWidth;
    const innerX = isRtl ? rulerWidth : 0;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(baseCell.img, innerX, 0, innerWidth, height);
    ctx.imageSmoothingEnabled = true;

    ctx.save();
    ctx.fillStyle = this.tColors.backGroundColor;
    ctx.fillRect(rulerX, 0, rulerWidth, height);
    ctx.translate(rulerX, 0);
    this.timeRulerRender.drawTimeRuler(ctx, height, this.dayStart, this.dayEnd);
    ctx.restore();

    this.drawRulerBorders(ctx, rulerX, rulerWidth, height, isRtl);

    baseCell.img = composedCanvas;
    return baseCell;
  }

  private drawRulerBorders(
    ctx: CanvasRenderingContext2D,
    rulerX: number,
    rulerWidth: number,
    height: number,
    isRtl: boolean,
  ): void {
    ctx.save();
    ctx.strokeStyle = this.tColors.borderColor;
    ctx.lineWidth = this.TIMELINE_RULER_BORDER_WIDTH;
    ctx.beginPath();
    ctx.moveTo(rulerX, 0);
    ctx.lineTo(rulerX + rulerWidth, 0);
    ctx.stroke();
    const innerEdgeX = isRtl ? rulerX + rulerWidth : rulerX;
    ctx.beginPath();
    ctx.moveTo(innerEdgeX, 0);
    ctx.lineTo(innerEdgeX, height);
    ctx.stroke();
    ctx.restore();
  }
}
