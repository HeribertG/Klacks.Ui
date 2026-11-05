// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pre-renders one cell template per day type, display state and zebra parity and copies the matching
 * template onto the availability grid canvas.
 */

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import { CheckboxDrawingService } from './checkbox-drawing.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { AvailabilityDayType } from 'src/app/domain/models/client-availability/availability-day-type.enum';
import { availabilityTemplateKey, resolveAvailabilityDayType } from './availability-template-key.helper';

const ALL_DAY_TYPES = [
  AvailabilityDayType.Weekday,
  AvailabilityDayType.Saturday,
  AvailabilityDayType.Sunday,
  AvailabilityDayType.Holiday,
  AvailabilityDayType.OfficialHoliday,
];

const ALL_DISPLAY_STATES = [
  AvailabilityDisplayState.Empty,
  AvailabilityDisplayState.Available,
  AvailabilityDisplayState.Blocked,
  AvailabilityDisplayState.Mixed,
];

const CELL_BORDER_LINE_WIDTH = 0.5;

@Injectable()
export class AvailabilityCellRenderingService {
  private static readonly ZEBRA_DARK_STEP = 8;

  private settings = inject(AvailabilitySettingService);
  private checkboxDrawing = inject(CheckboxDrawingService);
  private gridColors = inject(GridColorService);

  private templates = new Map<number, HTMLCanvasElement>();

  public initialize(): void {
    this.templates.clear();

    for (const dayType of ALL_DAY_TYPES) {
      const bgEven = this.backgroundFor(dayType);
      const bgOdd = DrawHelper.GetDarkColor(bgEven, AvailabilityCellRenderingService.ZEBRA_DARK_STEP);
      for (const state of ALL_DISPLAY_STATES) {
        this.createTemplate(availabilityTemplateKey(dayType, state, false), bgEven, state);
        this.createTemplate(availabilityTemplateKey(dayType, state, true), bgOdd, state);
      }
    }
  }

  public renderCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: AvailabilityDisplayState,
    isOddSlot: boolean,
    isWeekend: boolean,
    isSunday: boolean,
    isHoliday: boolean,
    isOfficialHoliday: boolean
  ): void {
    const dayType = resolveAvailabilityDayType(isWeekend, isSunday, isHoliday, isOfficialHoliday);
    const template = this.templates.get(availabilityTemplateKey(dayType, state, isOddSlot));
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

  private backgroundFor(dayType: AvailabilityDayType): string {
    switch (dayType) {
      case AvailabilityDayType.Saturday:
        return this.gridColors.backGroundColorSaturday;
      case AvailabilityDayType.Sunday:
        return this.gridColors.backGroundColorSunday;
      case AvailabilityDayType.Holiday:
        return this.gridColors.backGroundColorHolyday;
      case AvailabilityDayType.OfficialHoliday:
        return this.gridColors.backGroundColorOfficiallyHoliday;
      default:
        return this.gridColors.backGroundColor;
    }
  }

  private createTemplate(key: number, bgColor: string, state: AvailabilityDisplayState): void {
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
    ctx.lineWidth = CELL_BORDER_LINE_WIDTH;
    ctx.strokeRect(0, 0, cellWidth, cellHeight);

    const checkboxCanvas = this.checkboxDrawing.getCanvas(state);

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
