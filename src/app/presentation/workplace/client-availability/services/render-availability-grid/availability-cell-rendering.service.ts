// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import { CheckboxDrawingService } from './checkbox-drawing.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';

interface CellTemplate {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

@Injectable()
export class AvailabilityCellRenderingService {
  private static readonly ZEBRA_DARK_STEP = 8;

  private settings = inject(AvailabilitySettingService);
  private checkboxDrawing = inject(CheckboxDrawingService);
  private gridColors = inject(GridColorService);

  private templates = new Map<number, HTMLCanvasElement>();

  public initialize(): void {
    this.templates.clear();

    const bgNormal = this.gridColors.backGroundColor;
    const bgSaturday = this.gridColors.backGroundColorSaturday;
    const bgSunday = this.gridColors.backGroundColorSunday;
    const bgNormalOdd = DrawHelper.GetDarkColor(bgNormal, AvailabilityCellRenderingService.ZEBRA_DARK_STEP);
    const bgSaturdayOdd = DrawHelper.GetDarkColor(bgSaturday, AvailabilityCellRenderingService.ZEBRA_DARK_STEP);
    const bgSundayOdd = DrawHelper.GetDarkColor(bgSunday, AvailabilityCellRenderingService.ZEBRA_DARK_STEP);

    this.createTemplate(0, bgNormal, false);
    this.createTemplate(1, bgNormalOdd, false);
    this.createTemplate(2, bgNormal, true);
    this.createTemplate(3, bgNormalOdd, true);
    this.createTemplate(4, bgSaturday, false);
    this.createTemplate(5, bgSaturdayOdd, false);
    this.createTemplate(6, bgSaturday, true);
    this.createTemplate(7, bgSaturdayOdd, true);
    this.createTemplate(8, bgSunday, false);
    this.createTemplate(9, bgSundayOdd, false);
    this.createTemplate(10, bgSunday, true);
    this.createTemplate(11, bgSundayOdd, true);

    const bgHoliday = this.gridColors.backGroundColorHolyday;
    const bgOfficialHoliday = this.gridColors.backGroundColorOfficiallyHoliday;
    const bgHolidayOdd = DrawHelper.GetDarkColor(bgHoliday, AvailabilityCellRenderingService.ZEBRA_DARK_STEP);
    const bgOfficialHolidayOdd = DrawHelper.GetDarkColor(bgOfficialHoliday, AvailabilityCellRenderingService.ZEBRA_DARK_STEP);

    this.createTemplate(12, bgHoliday, false);
    this.createTemplate(13, bgHolidayOdd, false);
    this.createTemplate(14, bgHoliday, true);
    this.createTemplate(15, bgHolidayOdd, true);
    this.createTemplate(16, bgOfficialHoliday, false);
    this.createTemplate(17, bgOfficialHolidayOdd, false);
    this.createTemplate(18, bgOfficialHoliday, true);
    this.createTemplate(19, bgOfficialHolidayOdd, true);
  }

  public renderCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isAvailable: boolean,
    isOddSlot: boolean,
    isWeekend: boolean,
    isSunday: boolean,
    isHoliday: boolean,
    isOfficialHoliday: boolean
  ): void {
    const key = this.templateKey(isAvailable, isOddSlot, isWeekend, isSunday, isHoliday, isOfficialHoliday);
    const template = this.templates.get(key);
    if (!template) return;

    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;

    ctx.drawImage(
      template,
      0,
      0,
      template.width,
      template.height,
      x,
      y,
      cellWidth,
      cellHeight
    );
  }

  private templateKey(
    isAvailable: boolean,
    isOddSlot: boolean,
    isWeekend: boolean,
    isSunday: boolean,
    isHoliday: boolean,
    isOfficialHoliday: boolean
  ): number {
    const dayOffset = isOfficialHoliday ? 16 : isHoliday ? 12 : isSunday ? 8 : isWeekend ? 4 : 0;
    return dayOffset + (isAvailable ? 2 : 0) + (isOddSlot ? 1 : 0);
  }

  private createTemplate(key: number, bgColor: string, isChecked: boolean): void {
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    const ratio = DrawHelper.pixelRatio();

    const canvas = document.createElement('canvas');
    canvas.width = cellWidth * ratio;
    canvas.height = cellHeight * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cellWidth, cellHeight);

    ctx.strokeStyle = this.gridColors.borderColor;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, cellWidth, cellHeight);

    const checkboxCanvas = isChecked
      ? this.checkboxDrawing.getCheckedCanvas()
      : this.checkboxDrawing.getUncheckedCanvas();

    if (checkboxCanvas) {
      const cbSize = this.checkboxDrawing.checkboxSize;
      const cbX = (cellWidth - cbSize) / 2;
      const cbY = (cellHeight - cbSize) / 2;

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

    this.templates.set(key, canvas);
  }
}
