// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import { AvailabilityCalculationService } from './availability-calculation.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';

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
    const bgColor = this.gridColors.controlBackGroundColor;

    for (let dayIdx = 0; dayIdx < this.calculation.daysInView; dayIdx++) {
      const date = new Date(this.calculation.startDate);
      date.setDate(date.getDate() + dayIdx);
      const x = dayIdx * dayWidth;

      if (x > width) break;

      this.fillRect(ctx, x, 0, dayWidth, dayHeaderHeight, bgColor);
      DrawHelper.drawBorder(ctx, x, 0, dayWidth, dayHeaderHeight, bgColor, 2, Gradient3DBorderStyleEnum.Raised);

      const label = this.calculation.formatDayLabel(date, isMonthly);
      this.drawCenteredText(
        ctx, label, x, 0, dayWidth, dayHeaderHeight,
        font, this.gridColors.headerForeGroundColor
      );
    }
  }

  private renderHourRow(ctx: CanvasRenderingContext2D, width: number): void {
    const columnsPerDay = this.settings.columnsPerDay;
    const cellWidth = this.settings.cellWidth;
    const dayHeaderHeight = this.settings.dayHeaderHeight;
    const hourHeaderHeight = this.settings.hourHeaderHeight;
    const font = this.gridFonts.firstSubFontString;
    const bgColor = this.gridColors.controlBackGroundColor;

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

        const slotBg = holidayBg ?? bgColor;
        this.fillRect(ctx, x, dayHeaderHeight, cellWidth, hourHeaderHeight, slotBg);
        DrawHelper.drawBorder(ctx, x, dayHeaderHeight, cellWidth, dayHeaderHeight + hourHeaderHeight, slotBg, 2, Gradient3DBorderStyleEnum.Raised);

        const label = this.calculation.getSlotLabel(slotIdx);
        this.drawCenteredText(
          ctx, label, x, dayHeaderHeight, cellWidth, hourHeaderHeight,
          font, this.gridColors.headerForeGroundColor
        );
      }
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
