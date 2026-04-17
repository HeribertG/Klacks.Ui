// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Cell renderer for the timeline view.
 * Draws Work / WorkChange / Break entries as colored 3D blocks on a vertical
 * 00:00-24:00 axis. Expenses, ScheduleNote and ScheduleCommand entries are
 * skipped. WorkChange reuses the briefing color from the time-ruler palette so
 * the timeline stays visually consistent with shift-planning surfaces.
 * @param scheduleData - Mapping from (row, col) to the actual work-schedule entries
 * @param timeRangeService - Shared time-axis math (used for both the ruler and the blocks)
 * @param timeRulerRender - Padding policy for the time ruler, kept in sync with the row-header
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BaseCreateCellService } from 'src/app/presentation/shared/grid/services/body/create-cell.service';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import {
  IScheduleCell,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ScheduleDataService } from '../../services/schedule-data.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { TimeRulerRenderService } from 'src/app/presentation/shared/time-ruler/services/time-ruler-render.service';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';

@Injectable()
export class TimelineCreateCellService extends BaseCreateCellService {
  private scheduleData = inject(ScheduleDataService);
  private timeRulerRender = inject(TimeRulerRenderService);
  private timeRange = inject(TimeRangeService);
  private absenceLookup = inject(AbsenceLookupService);
  private translateService = inject(TranslateService);

  private readonly dayStart = OwnTime.forTime('00', '00');
  private readonly dayEnd = OwnTime.forTime('24', '00');
  private readonly blockMarginX = 0;
  private readonly workBorderDepth = 2;
  private readonly nonWorkInsetX = 1;
  private readonly nonWorkInsetY = 1;
  private readonly textThreshold = 15;
  private readonly textFont = '10px Arial';
  private readonly workChangeBlockColor = 'rgb(149, 185, 208)';
  private readonly evenHourDarken = 12;
  private readonly overlayCacheOffset = 10;
  private readonly stripedCacheSize = 20;
  private readonly minutesPerHour = 60;
  private readonly hoursPerDay = 24;
  private readonly stripeIntervalHours = 2;
  private readonly stripeDarkHours = 1;
  private readonly overlayDarkenAmount = 30;
  private readonly columnSeparatorLogicalWidth = 1;
  private readonly columnSeparatorDarken = 80;
  private readonly cellOutlineWidth = 0.5;

  private cachedRange = this.computeDisplayRange();
  private stripedCellCache: (HTMLCanvasElement | undefined)[] = new Array(
    this.stripedCacheSize,
  );

  override createCell(row: number, col: number): HTMLCanvasElement | undefined {
    const baseCanvas = super.createCell(row, col);
    if (!baseCanvas) {
      return baseCanvas;
    }

    if (!this.isFirstGroupRow(row)) {
      return baseCanvas;
    }

    const entries = this.scheduleData
      .getWorkScheduleForCell(row, col)
      .filter((e) => this.isTimelineEntry(e));

    if (entries.length === 0) {
      return baseCanvas;
    }

    const ctx = baseCanvas.getContext('2d');
    if (!ctx) {
      return baseCanvas;
    }

    const range = this.cachedRange;
    if (range.totalMinutes <= 0) {
      return baseCanvas;
    }

    const width = this.settings.cellWidth;
    const height = this.settings.cellHeight;
    const pixelsPerMinute = height / range.totalMinutes;
    for (const entry of entries) {
      this.drawEntryBlock(ctx, entry, width, pixelsPerMinute, range.displayFromMinutes);
    }

    return baseCanvas;
  }

  override drawCellTexts(_ctx: CanvasRenderingContext2D, _gridCell: GridCell): void {
    // Timeline renders work entries as time-positioned 3D blocks; cell-level
    // texts from the table view are intentionally suppressed.
  }

  override drawImage(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement): void {
    // Base implementation omits the destination size, which on HiDPI displays
    // scales the cached cell canvas by dpr and drifts the timeline stripes away
    // from the row-header ruler. Pass the logical size so the cached canvas
    // maps 1:1 into the cell and stays aligned with the ruler.
    const dpr = DrawHelper.pixelRatio();
    ctx.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
  }

  override reset(): void {
    super.reset();
    this.cachedRange = this.computeDisplayRange();
    this.stripedCellCache = new Array(this.stripedCacheSize);
  }

  override getCellCanvas(
    weekDay: number,
    lastRow: number,
    isOverlay = false,
  ): HTMLCanvasElement {
    const index = weekDay + lastRow + (isOverlay ? this.overlayCacheOffset : 0);
    let canvas = this.stripedCellCache[index];
    if (!canvas) {
      canvas = this.buildTimelineCellCanvas(
        weekDay as WeekDaysEnum,
        lastRow > 0,
        isOverlay,
      );
      this.stripedCellCache[index] = canvas;
    }
    return canvas;
  }

  private buildTimelineCellCanvas(
    weekDay: WeekDaysEnum,
    isLast: boolean,
    isOverlay: boolean,
  ): HTMLCanvasElement {
    const logicalWidth = this.settings.cellWidth + this.settings.increaseBorder;
    const logicalHeight = this.settings.cellHeight + this.settings.increaseBorder;
    const cellHeightLogical = this.settings.cellHeight;

    const canvas = document.createElement('canvas');
    const ctx = DrawHelper.createHiDPICanvas(canvas, logicalWidth, logicalHeight, true);
    if (!ctx) {
      return canvas;
    }

    const baseColor = this.getTimelineBaseColor(weekDay, isOverlay);

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    this.drawHourStripes(ctx, baseColor, logicalWidth, cellHeightLogical);
    this.drawCellOutline(ctx, logicalWidth, logicalHeight);

    if (isLast) {
      this.drawRowSeparator(ctx, logicalWidth, cellHeightLogical);
    }

    this.drawColumnSeparator(ctx, logicalWidth, cellHeightLogical);

    return canvas;
  }

  private drawHourStripes(
    ctx: CanvasRenderingContext2D,
    baseColor: string,
    logicalWidth: number,
    cellHeightLogical: number,
  ): void {
    const range = this.cachedRange;
    if (range.totalMinutes <= 0) {
      return;
    }

    const pixelsPerMinute = cellHeightLogical / range.totalMinutes;
    const stripeColor = DrawHelper.GetDarkColor(baseColor, this.evenHourDarken);

    ctx.save();
    ctx.fillStyle = stripeColor;
    for (let hour = 0; hour < this.hoursPerDay; hour += this.stripeIntervalHours) {
      const startMinutes = hour * this.minutesPerHour;
      const endMinutes = startMinutes + this.stripeDarkHours * this.minutesPerHour;
      const yStart = (startMinutes - range.displayFromMinutes) * pixelsPerMinute;
      const yEnd = (endMinutes - range.displayFromMinutes) * pixelsPerMinute;
      if (yEnd < 0 || yStart > cellHeightLogical) {
        continue;
      }
      const drawY = Math.max(0, yStart);
      const drawH = Math.min(cellHeightLogical, yEnd) - drawY;
      if (drawH > 0) {
        ctx.fillRect(0, drawY, logicalWidth, drawH);
      }
    }
    ctx.restore();
  }

  private drawCellOutline(
    ctx: CanvasRenderingContext2D,
    logicalWidth: number,
    logicalHeight: number,
  ): void {
    ctx.save();
    ctx.strokeStyle = this.gridColors.borderColor;
    ctx.lineWidth = this.cellOutlineWidth;
    ctx.strokeRect(0, 0, logicalWidth, logicalHeight);
    ctx.restore();
  }

  private drawRowSeparator(
    ctx: CanvasRenderingContext2D,
    logicalWidth: number,
    cellHeightLogical: number,
  ): void {
    ctx.save();
    ctx.strokeStyle = this.gridColors.boundaryBorderColor;
    ctx.lineWidth = this.settings.boundaryBorderWidth;
    ctx.beginPath();
    ctx.moveTo(0, cellHeightLogical);
    ctx.lineTo(logicalWidth, cellHeightLogical);
    ctx.stroke();
    ctx.restore();
  }

  private drawColumnSeparator(
    ctx: CanvasRenderingContext2D,
    logicalWidth: number,
    cellHeightLogical: number,
  ): void {
    ctx.save();
    ctx.fillStyle = DrawHelper.GetDarkColor(
      this.gridColors.borderColor,
      this.columnSeparatorDarken,
    );
    ctx.fillRect(
      logicalWidth - this.columnSeparatorLogicalWidth,
      0,
      this.columnSeparatorLogicalWidth,
      cellHeightLogical,
    );
    ctx.restore();
  }

  private getTimelineBaseColor(day: WeekDaysEnum, isOverlay: boolean): string {
    let baseColor: string;
    switch (day) {
      case WeekDaysEnum.Workday:
        baseColor = this.gridColors.backGroundColor;
        break;
      case WeekDaysEnum.Saturday:
        baseColor = this.gridColors.backGroundColorSaturday;
        break;
      case WeekDaysEnum.Sunday:
        baseColor = this.gridColors.backGroundColorSunday;
        break;
      case WeekDaysEnum.Holiday:
        baseColor = this.gridColors.backGroundColorHolyday;
        break;
      case WeekDaysEnum.OfficiallyHoliday:
        baseColor = this.gridColors.backGroundColorOfficiallyHoliday;
        break;
      default:
        baseColor = this.gridColors.backGroundColor;
    }
    return isOverlay
      ? DrawHelper.GetDarkColor(baseColor, this.overlayDarkenAmount)
      : baseColor;
  }

  private isFirstGroupRow(row: number): boolean {
    const clientIndex = this.gridData.rowGroupIndex[row];
    if (clientIndex === undefined) {
      return false;
    }
    return this.gridData.indexGroupRow[clientIndex] === row;
  }

  private isTimelineEntry(entry: IScheduleCell): boolean {
    return (
      entry.entryType === WorkScheduleEntryType.Work ||
      entry.entryType === WorkScheduleEntryType.WorkChange ||
      entry.entryType === WorkScheduleEntryType.Break
    );
  }

  private drawEntryBlock(
    ctx: CanvasRenderingContext2D,
    entry: IScheduleCell,
    width: number,
    pixelsPerMinute: number,
    displayFromMinutes: number,
  ): void {
    const minutes = this.toMinutesRange(entry);
    if (!minutes) {
      return;
    }

    const yStart = (minutes.start - displayFromMinutes) * pixelsPerMinute;
    const yEnd = (minutes.end - displayFromMinutes) * pixelsPerMinute;
    const blockHeight = Math.max(2, yEnd - yStart);

    const isWork = entry.entryType === WorkScheduleEntryType.Work;
    const marginX = isWork ? this.blockMarginX : this.blockMarginX + this.nonWorkInsetX;
    const insetY = isWork ? 0 : this.nonWorkInsetY;
    const blockWidth = Math.max(1, width - marginX * 2);
    const color = this.resolveBlockColor(entry);
    const rect = new Rectangle(
      marginX,
      yStart + insetY,
      marginX + blockWidth,
      yStart + blockHeight - insetY,
    );

    DrawHelper.fillRectangle(ctx, color, rect);

    if (isWork) {
      DrawHelper.drawBorder(
        ctx,
        marginX,
        yStart,
        blockWidth,
        yStart + blockHeight,
        color,
        this.workBorderDepth,
        Gradient3DBorderStyleEnum.Raised,
      );
    }

    const label = this.resolveBlockLabel(entry);
    if (blockHeight > this.textThreshold && label) {
      ctx.save();
      ctx.font = this.textFont;
      ctx.fillStyle = DrawHelper.getContrastTextColor(color);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        label,
        Math.round(width / 2),
        Math.round(yStart + blockHeight / 2),
      );
      ctx.restore();
    }
  }

  private computeDisplayRange() {
    const paddingMinutes = this.timeRulerRender.calculatePaddingMinutes(
      this.dayStart,
      this.dayEnd,
    );
    return this.timeRange.calculateDisplayRange(
      this.dayStart,
      this.dayEnd,
      paddingMinutes,
    );
  }

  private toMinutesRange(
    entry: IScheduleCell,
  ): { start: number; end: number } | undefined {
    if (!entry.startTime || !entry.endTime) {
      return undefined;
    }
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    if (!start && !entry.startTime.startsWith('00')) {
      return undefined;
    }
    return { start, end: end <= start ? end + 24 * 60 : end };
  }

  private resolveBlockColor(entry: IScheduleCell): string {
    switch (entry.entryType) {
      case WorkScheduleEntryType.Break: {
        const absenceColor = this.absenceLookup.getColorForEntryId(entry.entryId);
        return absenceColor ?? this.gridColors.backGroundColorHolyday;
      }
      case WorkScheduleEntryType.WorkChange:
        return this.workChangeBlockColor;
      default:
        return this.gridColors.controlBackGroundColor;
    }
  }

  private resolveBlockLabel(entry: IScheduleCell): string {
    if (entry.entryType === WorkScheduleEntryType.Break) {
      const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
      const abbr = this.absenceLookup.getAbbreviationForEntryId(entry.entryId, language);
      if (abbr) {
        return abbr;
      }
    }
    return entry.abbreviation ?? '';
  }
}
