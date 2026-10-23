// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for drawing the vertical time scale (ticks and hour labels) of the time ruler.
 * @param timeRangeService - Display range, padding and tick increment calculation
 * @param gridColorService - Font color of ticks and labels
 */

import { inject, Injectable } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { TimeRangeService } from './time-range.service';
import { TIME_RULER_WIDTH } from './time-ruler.constants';

@Injectable({
  providedIn: 'root',
})
export class TimeRulerScaleRenderService {
  private timeRangeService = inject(TimeRangeService);
  private gridColorService = inject(GridColorService);

  private readonly MINUTES_PER_HOUR = 60;
  private readonly MINUTES_PER_HALF_HOUR = 30;
  private readonly MINUTES_PER_QUARTER_HOUR = 15;
  private readonly MINUTE_INCREMENT = 1;

  private readonly MIN_PIXELS_FOR_HALF_HOUR_DISPLAY = 15;
  private readonly MIN_PIXELS_FOR_QUARTER_HOUR_DISPLAY = 12;

  private readonly HOUR_LINE_LENGTH = 25;
  private readonly HALF_HOUR_LINE_LENGTH = 18;
  private readonly QUARTER_HOUR_LINE_LENGTH = 12;
  private readonly MINUTE_LINE_LENGTH = 6;

  private readonly LABEL_OFFSET = 3;

  private readonly TIME_MARK_LINE_WIDTH = 1;
  private readonly TIME_MARK_FONT = '10px Arial';
  private readonly TIME_MARK_TEXT_BASELINE: CanvasTextBaseline = 'middle';

  drawTimeRuler(
    ctx: CanvasRenderingContext2D,
    height: number,
    fromTime: OwnTime,
    untilTime: OwnTime,
    paddingMinutesOverride?: number,
    skipEdgeLabels = false,
    rulerWidthOverride?: number
  ): void {
    const paddingMinutes =
      paddingMinutesOverride !== undefined
        ? paddingMinutesOverride
        : this.timeRangeService.calculatePaddingMinutes(fromTime, untilTime);
    const range = this.timeRangeService.calculateDisplayRange(
      fromTime,
      untilTime,
      paddingMinutes
    );

    if (range.totalMinutes <= 0) return;

    ctx.strokeStyle = this.gridColorService.mainFontColor;
    ctx.fillStyle = this.gridColorService.mainFontColor;
    ctx.lineWidth = this.TIME_MARK_LINE_WIDTH;
    ctx.font = this.TIME_MARK_FONT;
    ctx.textAlign = document.documentElement.dir === 'rtl' ? 'right' : 'left';
    ctx.textBaseline = this.TIME_MARK_TEXT_BASELINE;

    const pixelsPerMinute = height / range.totalMinutes;
    const pixelsPerHalfHour = pixelsPerMinute * this.MINUTES_PER_HALF_HOUR;
    const pixelsPerQuarterHour =
      pixelsPerMinute * this.MINUTES_PER_QUARTER_HOUR;

    const { increment, showHalfHourLabels } =
      this.timeRangeService.calculateOptimalIncrement(pixelsPerMinute);
    const showHalfHours =
      pixelsPerHalfHour >= this.MIN_PIXELS_FOR_HALF_HOUR_DISPLAY;
    const showQuarterHours =
      pixelsPerQuarterHour >= this.MIN_PIXELS_FOR_QUARTER_HOUR_DISPLAY;
    const showMinutes = increment === this.MINUTE_INCREMENT;

    let startMinute = range.displayFromMinutes;
    if (increment >= this.MINUTES_PER_HOUR) {
      startMinute =
        Math.floor(range.displayFromMinutes / increment) * increment;
    }

    for (
      let minute = startMinute;
      minute <= range.displayUntilMinutes;
      minute += increment
    ) {
      const relativeMinutes = minute - range.displayFromMinutes;
      const y = (relativeMinutes / range.totalMinutes) * height;

      const isHour = minute % this.MINUTES_PER_HOUR === 0;
      const isHalfHour = minute % this.MINUTES_PER_HALF_HOUR === 0;
      const isQuarterHour = minute % this.MINUTES_PER_QUARTER_HOUR === 0;

      let lineLength = 0;
      let showLabel = false;

      if (isHour) {
        lineLength = this.HOUR_LINE_LENGTH;
        showLabel = true;
      } else if (isHalfHour && showHalfHours) {
        lineLength = this.HALF_HOUR_LINE_LENGTH;
        showLabel = showMinutes || showHalfHourLabels;
      } else if (isQuarterHour && showQuarterHours) {
        lineLength = this.QUARTER_HOUR_LINE_LENGTH;
        showLabel = false;
      } else if (showMinutes) {
        lineLength = this.MINUTE_LINE_LENGTH;
        showLabel = false;
      }

      if (lineLength > 0) {
        const isRtl = document.documentElement.dir === 'rtl';
        const rulerW = rulerWidthOverride ?? TIME_RULER_WIDTH;
        ctx.beginPath();
        if (isRtl) {
          ctx.moveTo(rulerW, y);
          ctx.lineTo(rulerW - lineLength, y);
        } else {
          ctx.moveTo(0, y);
          ctx.lineTo(lineLength, y);
        }
        ctx.stroke();

        if (showLabel) {
          const isEdgeLabel =
            minute <= range.displayFromMinutes ||
            minute >= range.displayUntilMinutes;
          if (!(skipEdgeLabels && isEdgeLabel)) {
            const timeLabel = this.timeRangeService.formatTime(minute);
            const labelY = Math.round(y);
            const previousBaseline = ctx.textBaseline;
            if (minute <= range.displayFromMinutes) {
              ctx.textBaseline = 'top';
            } else if (minute >= range.displayUntilMinutes) {
              ctx.textBaseline = 'bottom';
            }
            if (isRtl) {
              ctx.fillText(
                timeLabel,
                Math.round(rulerW - lineLength - this.LABEL_OFFSET),
                labelY,
              );
            } else {
              ctx.fillText(
                timeLabel,
                Math.round(lineLength + this.LABEL_OFFSET),
                labelY,
              );
            }
            ctx.textBaseline = previousBaseline;
          }
        }
      }
    }
  }
}
