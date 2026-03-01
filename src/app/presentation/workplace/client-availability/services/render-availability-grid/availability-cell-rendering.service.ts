// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import { CheckboxDrawingService } from './checkbox-drawing.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Injectable()
export class AvailabilityCellRenderingService {
  private settings = inject(AvailabilitySettingService);
  private checkboxDrawing = inject(CheckboxDrawingService);
  private gridColors = inject(GridColorService);

  public renderCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isAvailable: boolean,
    isWeekend: boolean
  ): void {
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;

    const bg = isWeekend
      ? this.gridColors.backGroundColorSaturday
      : this.gridColors.backGroundColor;

    ctx.fillStyle = bg;
    ctx.fillRect(x, y, cellWidth, cellHeight);

    ctx.strokeStyle = this.gridColors.borderColor;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, cellWidth, cellHeight);

    const checkboxCanvas = isAvailable
      ? this.checkboxDrawing.getCheckedCanvas()
      : this.checkboxDrawing.getUncheckedCanvas();

    if (checkboxCanvas) {
      const cbSize = this.checkboxDrawing.checkboxSize;
      const cbX = x + (cellWidth - cbSize) / 2;
      const cbY = y + (cellHeight - cbSize) / 2;

      ctx.drawImage(
        checkboxCanvas,
        0,
        0,
        checkboxCanvas.width,
        checkboxCanvas.height,
        cbX,
        cbY,
        cbSize,
        cbSize
      );
    }
  }
}
