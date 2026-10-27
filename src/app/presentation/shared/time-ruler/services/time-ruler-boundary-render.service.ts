// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for drawing the horizontal boundary lines of the time ruler (time window and shift window) with fading gradients.
 * @param timeRangeService - Display range, padding and time string parsing
 * @param gridColorService - Warning color of the time window and focus color of the shift window
 */

import { inject, Injectable } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DisplayRange } from './display-range.interface';
import { TimeRangeService } from './time-range.service';

@Injectable({
  providedIn: 'root',
})
export class TimeRulerBoundaryRenderService {
  private timeRangeService = inject(TimeRangeService);
  private gridColorService = inject(GridColorService);

  private readonly MINUTES_PER_HOUR = 60;
  private readonly MINUTES_PER_DAY = 24 * 60;

  private readonly BOUNDARY_LINE_WIDTH = 2;
  private readonly BOUNDARY_GRADIENT_HEIGHT = 12;
  private readonly BOUNDARY_GRADIENT_OPACITY = 0.2;
  private readonly BOUNDARY_GRADIENT_OPACITY_TRANSPARENT = 0.0;

  drawBoundaryLine(
    ctx: CanvasRenderingContext2D,
    y: number,
    width: number,
    color: string,
    lineWidth: number,
    isStart: boolean
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    const rgbaColor = this.convertColorToRgba(
      color,
      this.BOUNDARY_GRADIENT_OPACITY
    );
    const transparentColor = this.convertColorToRgba(
      color,
      this.BOUNDARY_GRADIENT_OPACITY_TRANSPARENT
    );

    if (isStart) {
      const gradient = ctx.createLinearGradient(
        0,
        y,
        0,
        y + this.BOUNDARY_GRADIENT_HEIGHT
      );

      gradient.addColorStop(0, rgbaColor);
      gradient.addColorStop(1, transparentColor);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, width, this.BOUNDARY_GRADIENT_HEIGHT);
    } else {
      const gradient = ctx.createLinearGradient(
        0,
        y - this.BOUNDARY_GRADIENT_HEIGHT,
        0,
        y
      );

      gradient.addColorStop(0, transparentColor);
      gradient.addColorStop(1, rgbaColor);

      ctx.fillStyle = gradient;
      ctx.fillRect(
        0,
        y - this.BOUNDARY_GRADIENT_HEIGHT,
        width,
        this.BOUNDARY_GRADIENT_HEIGHT
      );
    }
  }

  convertColorToRgba(color: string, opacity: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return `rgba(0, 0, 0, ${opacity})`;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    const pixel = imageData.data;

    return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${opacity})`;
  }

  drawBoundaryLines(
    ctx: CanvasRenderingContext2D,
    startY: number,
    endY: number,
    width: number,
    color: string,
    lineWidth: number
  ): void {
    this.drawBoundaryLine(ctx, startY, width, color, lineWidth, true);
    this.drawBoundaryLine(ctx, endY, width, color, lineWidth, false);
  }

  drawRedBoundaryLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fromTime: OwnTime,
    untilTime: OwnTime
  ): void {
    const paddingMinutes = this.timeRangeService.calculatePaddingMinutes(fromTime, untilTime);
    const range = this.timeRangeService.calculateDisplayRange(
      fromTime,
      untilTime,
      paddingMinutes
    );

    const fromY =
      ((range.originalFromMinutes - range.displayFromMinutes) /
        range.totalMinutes) *
      height;
    const untilY =
      ((range.originalUntilMinutes - range.displayFromMinutes) /
        range.totalMinutes) *
      height;

    this.drawBoundaryLines(
      ctx,
      fromY,
      untilY,
      width,
      this.gridColorService.warningColor,
      this.BOUNDARY_LINE_WIDTH
    );
  }

  drawBlueBoundaryLines(
    ctx: CanvasRenderingContext2D,
    item: IContainerTemplateItem,
    range: DisplayRange,
    boxWidth: number,
    marginLeftRight: number,
    height: number
  ): void {
    if (!item.shift?.startShift || !item.shift?.endShift) return;

    const startTime = this.timeRangeService.parseTimeString(
      item.shift.startShift
    );
    const endTime = this.timeRangeService.parseTimeString(item.shift.endShift);

    if (!startTime || !endTime) return;

    const startMinutes =
      startTime.hours * this.MINUTES_PER_HOUR + startTime.minutes;
    let endMinutes = endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes;

    if (endMinutes < startMinutes) {
      endMinutes += this.MINUTES_PER_DAY;
    }

    const timeRangeStartY =
      ((startMinutes - range.displayFromMinutes) / range.totalMinutes) * height;
    const timeRangeEndY =
      ((endMinutes - range.displayFromMinutes) / range.totalMinutes) * height;

    this.drawBoundaryLines(
      ctx,
      timeRangeStartY,
      timeRangeEndY,
      boxWidth + marginLeftRight * 2,
      this.gridColorService.focusBorderColor,
      this.BOUNDARY_LINE_WIDTH
    );
  }
}
