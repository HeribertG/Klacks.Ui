// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import { AvailabilityCalculationService } from './availability-calculation.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { HourGroupingMode } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { AvailabilityCoordinateService } from '../availability-coordinate.service';

interface SegmentCache {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  bgColor: string;
}

@Injectable()
export class AvailabilityHeaderRenderingService {
  private settings = inject(AvailabilitySettingService);
  private calculation = inject(AvailabilityCalculationService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  private coord = inject(AvailabilityCoordinateService);

  private daySegmentCache: SegmentCache | undefined;
  private hourSegmentCache: SegmentCache | undefined;
  private hourHolidayCache: SegmentCache | undefined;
  private hourOfficialHolidayCache: SegmentCache | undefined;

  public renderHeader(ctx: CanvasRenderingContext2D, viewportWidth: number, scrollX: number): void {
    this.fillRect(ctx, 0, 0, viewportWidth, this.settings.cellHeaderHeight, this.gridColors.controlBackGroundColor);
    this.renderDayRow(ctx, viewportWidth, scrollX);
    this.renderHourRow(ctx, viewportWidth, scrollX);
  }

  public invalidateCache(): void {
    this.daySegmentCache = undefined;
    this.hourSegmentCache = undefined;
    this.hourHolidayCache = undefined;
    this.hourOfficialHolidayCache = undefined;
  }

  private ensureDaySegmentCache(): HTMLCanvasElement {
    const dayWidth = this.settings.columnsPerDay * this.settings.cellWidth;
    const dayHeaderHeight = this.settings.dayHeaderHeight;
    const bgColor = this.gridColors.controlBackGroundColor;

    if (this.daySegmentCache
      && this.daySegmentCache.width === dayWidth
      && this.daySegmentCache.height === dayHeaderHeight
      && this.daySegmentCache.bgColor === bgColor) {
      return this.daySegmentCache.canvas;
    }

    this.daySegmentCache = this.createSegmentCanvas(dayWidth, dayHeaderHeight, bgColor);
    return this.daySegmentCache.canvas;
  }

  private ensureHourSegmentCache(): HTMLCanvasElement {
    const cellWidth = this.settings.cellWidth;
    const hourHeaderHeight = this.settings.hourHeaderHeight;
    const bgColor = this.gridColors.controlBackGroundColor;

    if (this.hourSegmentCache
      && this.hourSegmentCache.width === cellWidth
      && this.hourSegmentCache.height === hourHeaderHeight
      && this.hourSegmentCache.bgColor === bgColor) {
      return this.hourSegmentCache.canvas;
    }

    this.hourSegmentCache = this.createSegmentCanvas(cellWidth, hourHeaderHeight, bgColor);
    return this.hourSegmentCache.canvas;
  }

  private ensureHourHolidayCache(): HTMLCanvasElement {
    const cellWidth = this.settings.cellWidth;
    const hourHeaderHeight = this.settings.hourHeaderHeight;
    const bgColor = this.gridColors.backGroundColorHolyday;

    if (this.hourHolidayCache
      && this.hourHolidayCache.width === cellWidth
      && this.hourHolidayCache.height === hourHeaderHeight
      && this.hourHolidayCache.bgColor === bgColor) {
      return this.hourHolidayCache.canvas;
    }

    this.hourHolidayCache = this.createSegmentCanvas(cellWidth, hourHeaderHeight, bgColor);
    return this.hourHolidayCache.canvas;
  }

  private ensureHourOfficialHolidayCache(): HTMLCanvasElement {
    const cellWidth = this.settings.cellWidth;
    const hourHeaderHeight = this.settings.hourHeaderHeight;
    const bgColor = this.gridColors.backGroundColorOfficiallyHoliday;

    if (this.hourOfficialHolidayCache
      && this.hourOfficialHolidayCache.width === cellWidth
      && this.hourOfficialHolidayCache.height === hourHeaderHeight
      && this.hourOfficialHolidayCache.bgColor === bgColor) {
      return this.hourOfficialHolidayCache.canvas;
    }

    this.hourOfficialHolidayCache = this.createSegmentCanvas(cellWidth, hourHeaderHeight, bgColor);
    return this.hourOfficialHolidayCache.canvas;
  }

  private createSegmentCanvas(width: number, height: number, bgColor: string): SegmentCache {
    const ratio = DrawHelper.pixelRatio();
    const canvas = document.createElement('canvas');
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    DrawHelper.drawBorder(ctx, 0, 0, width, height, bgColor, 2, Gradient3DBorderStyleEnum.Raised);

    return { canvas, width, height, bgColor };
  }

  private renderDayRow(ctx: CanvasRenderingContext2D, viewportWidth: number, scrollX: number): void {
    const columnsPerDay = this.settings.columnsPerDay;
    const cellWidth = this.settings.cellWidth;
    const dayWidth = columnsPerDay * cellWidth;
    const dayHeaderHeight = this.settings.dayHeaderHeight;
    const isFullDay = this.settings.hourGroupingMode() === HourGroupingMode.FullDay;
    const isMonthly = this.settings.viewMode() === PaymentInterval.Monthly;
    const font = this.gridFonts.headerFontString;
    const textColor = this.gridColors.headerForeGroundColor;
    const template = this.ensureDaySegmentCache();

    const firstDay = Math.floor(scrollX / dayWidth);
    const lastDay = Math.min(
      Math.ceil((scrollX + viewportWidth) / dayWidth),
      this.calculation.daysInView
    );

    for (let dayIdx = firstDay; dayIdx < lastDay; dayIdx++) {
      const date = new Date(this.calculation.startDate);
      date.setDate(date.getDate() + dayIdx);
      const x = this.coord.absoluteSpanX(dayIdx * columnsPerDay, columnsPerDay, scrollX);

      ctx.drawImage(template, 0, 0, template.width, template.height, x, 0, dayWidth, dayHeaderHeight);

      const label = isFullDay
        ? this.calculation.formatWeekdayOnly(date)
        : this.calculation.formatDayLabel(date, isMonthly);
      this.drawCenteredText(
        ctx, label, x, 0, dayWidth, dayHeaderHeight,
        font, textColor
      );
    }
  }

  private renderHourRow(ctx: CanvasRenderingContext2D, viewportWidth: number, scrollX: number): void {
    const columnsPerDay = this.settings.columnsPerDay;
    const cellWidth = this.settings.cellWidth;
    const dayHeaderHeight = this.settings.dayHeaderHeight;
    const hourHeaderHeight = this.settings.hourHeaderHeight;
    const isFullDay = this.settings.hourGroupingMode() === HourGroupingMode.FullDay;
    const font = this.gridFonts.firstSubFontString;
    const textColor = this.gridColors.headerForeGroundColor;
    const totalCols = this.calculation.totalColumns;

    const normalTemplate = this.ensureHourSegmentCache();
    const holidayTemplate = this.ensureHourHolidayCache();
    const officialHolidayTemplate = this.ensureHourOfficialHolidayCache();

    const firstCol = Math.floor(scrollX / cellWidth);
    const lastCol = Math.min(
      Math.ceil((scrollX + viewportWidth) / cellWidth) + 1,
      totalCols
    );

    let prevDayIdx = -1;
    let template = normalTemplate;
    let currentDate: Date | undefined;

    for (let col = firstCol; col < lastCol; col++) {
      const dayIdx = Math.floor(col / columnsPerDay);
      const slotIdx = col % columnsPerDay;
      const x = this.coord.absoluteColX(col, scrollX);

      if (dayIdx !== prevDayIdx) {
        prevDayIdx = dayIdx;
        currentDate = new Date(this.calculation.startDate);
        currentDate.setDate(currentDate.getDate() + dayIdx);
        const isHoliday = this.calculation.isHoliday(currentDate);
        template = isHoliday
          ? this.calculation.isOfficialHoliday(currentDate)
            ? officialHolidayTemplate
            : holidayTemplate
          : normalTemplate;
      }

      ctx.drawImage(template, 0, 0, template.width, template.height, x, dayHeaderHeight, cellWidth, hourHeaderHeight);

      const label = isFullDay
        ? `${currentDate!.getDate()}`
        : this.calculation.getSlotLabel(slotIdx);
      this.drawCenteredText(
        ctx, label, x, dayHeaderHeight, cellWidth, hourHeaderHeight,
        font, textColor
      );
    }
  }

  private fillRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  private drawCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number, w: number, h: number,
    font: string, color: string
  ): void {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.restore();
  }
}
