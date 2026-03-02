// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import { AvailabilityCalculationService } from './availability-calculation.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';

@Injectable()
export class AvailabilityHeaderRenderingService {
  private settings = inject(AvailabilitySettingService);
  private calculation = inject(AvailabilityCalculationService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);

  public renderHeader(ctx: CanvasRenderingContext2D, width: number): void {
    this.fillRect(ctx, 0, 0, width, this.settings.cellHeaderHeight, this.gridColors.controlBackGroundColor);
    this.renderDayRow(ctx, width);
    this.renderHourRow(ctx, width);
  }

  private renderDayRow(ctx: CanvasRenderingContext2D, width: number): void {
    const columnsPerDay = this.settings.columnsPerDay;
    const cellWidth = this.settings.cellWidth;
    const dayWidth = columnsPerDay * cellWidth;
    const dayHeaderHeight = this.settings.dayHeaderHeight;
    const isMonthly = this.settings.viewMode() === PaymentInterval.Monthly;
    const font = this.gridFonts.headerFontString;

    for (let dayIdx = 0; dayIdx < this.calculation.daysInView; dayIdx++) {
      const date = new Date(this.calculation.startDate);
      date.setDate(date.getDate() + dayIdx);
      const x = dayIdx * dayWidth;

      if (x > width) break;

      this.fillRect(ctx, x, 0, dayWidth, dayHeaderHeight, this.gridColors.controlBackGroundColor);

      ctx.strokeStyle = this.gridColors.borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + dayWidth, 0);
      ctx.lineTo(x + dayWidth, dayHeaderHeight);
      ctx.stroke();

      const label = this.calculation.formatDayLabel(date, isMonthly);
      this.drawCenteredText(
        ctx, label, x, 0, dayWidth, dayHeaderHeight,
        font, this.gridColors.headerForeGroundColor
      );
    }

    ctx.strokeStyle = this.gridColors.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, dayHeaderHeight);
    ctx.lineTo(width, dayHeaderHeight);
    ctx.stroke();
  }

  private renderHourRow(ctx: CanvasRenderingContext2D, width: number): void {
    const columnsPerDay = this.settings.columnsPerDay;
    const cellWidth = this.settings.cellWidth;
    const dayHeaderHeight = this.settings.dayHeaderHeight;
    const hourHeaderHeight = this.settings.hourHeaderHeight;
    const font = this.gridFonts.firstSubFontString;

    for (let dayIdx = 0; dayIdx < this.calculation.daysInView; dayIdx++) {
      const date = new Date(this.calculation.startDate);
      date.setDate(date.getDate() + dayIdx);
      const isHoliday = this.calculation.isHoliday(date);
      const holidayBg = isHoliday
        ? this.calculation.isOfficialHoliday(date)
          ? this.gridColors.backGroundColorOfficiallyHoliday
          : this.gridColors.backGroundColorHolyday
        : undefined;

      for (let slotIdx = 0; slotIdx < columnsPerDay; slotIdx++) {
        const col = dayIdx * columnsPerDay + slotIdx;
        const x = col * cellWidth;

        if (x > width) break;

        if (holidayBg) {
          this.fillRect(ctx, x, dayHeaderHeight, cellWidth, hourHeaderHeight, holidayBg);
        }

        ctx.strokeStyle = this.gridColors.borderColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x + cellWidth, dayHeaderHeight);
        ctx.lineTo(x + cellWidth, dayHeaderHeight + hourHeaderHeight);
        ctx.stroke();

        const label = this.calculation.getSlotLabel(slotIdx);
        this.drawCenteredText(
          ctx, label, x, dayHeaderHeight, cellWidth, hourHeaderHeight,
          font, this.gridColors.headerForeGroundColor
        );
      }
    }

    ctx.strokeStyle = this.gridColors.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.settings.cellHeaderHeight);
    ctx.lineTo(width, this.settings.cellHeaderHeight);
    ctx.stroke();
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
