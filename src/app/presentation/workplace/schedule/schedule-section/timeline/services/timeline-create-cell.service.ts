// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Cell renderer for the timeline view.
 * Coordinates per-entry rendering by delegating Work, WorkChange and Break blocks
 * to their dedicated ITimelineBlockRenderer implementations. Expenses, ScheduleNote
 * and ScheduleCommand entries are skipped. Also suppresses the cell-level background
 * fill of the base renderer so hour stripes remain visible behind the blocks.
 * @param scheduleData - Mapping from (row, col) to the actual work-schedule entries
 * @param timeRangeService - Shared time-axis math (used for both the ruler and the blocks)
 */
import { inject, Injectable } from '@angular/core';
import { BaseCreateCellService } from 'src/app/presentation/shared/grid/services/body/create-cell.service';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import {
  IScheduleCell,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { ScheduleDataService } from '../../services/schedule-data.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';
import { ITimelineBlockRenderer } from '../renderers/timeline-block-renderer.interface';
import { WorkBlockRendererService } from '../renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../renderers/work-change-block-renderer.service';
import { BreakBlockRendererService } from '../renderers/break-block-renderer.service';
import { ScheduleTimelineRangeService } from '../../../services/schedule-timeline-range.service';

interface DrawBlockContext {
  entry: IScheduleCell;
  startMinutes: number;
  endMinutes: number;
  width: number;
  pixelsPerMinute: number;
  displayFromMinutes: number;
}

interface TimelineCellEntries {
  todayEntries: IScheduleCell[];
  overflowEntries: IScheduleCell[];
  availabilityRanges: { startMinutes: number; endMinutes: number }[];
}

interface TimelineCellGeometry {
  width: number;
  height: number;
  pixelsPerMinute: number;
  displayFromMinutes: number;
}

@Injectable()
export class TimelineCreateCellService extends BaseCreateCellService {
  private scheduleData = inject(ScheduleDataService);
  private timeRange = inject(TimeRangeService);
  private rangeService = inject(ScheduleTimelineRangeService);
  private workRenderer = inject(WorkBlockRendererService);
  private workChangeRenderer = inject(WorkChangeBlockRendererService);
  private breakRenderer = inject(BreakBlockRendererService);

  private readonly minBlockHeight = 2;
  private readonly textThreshold = 15;
  private readonly blockLabelFontSize = 10;
  private readonly blockLabelFontFamily = 'Arial';
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
  private readonly collisionOverlayAlpha = 0.15;
  private readonly dayTotalMinutes = this.hoursPerDay * this.minutesPerHour;

  private cachedRange = this.computeDisplayRange();
  private stripedCellCache: (HTMLCanvasElement | undefined)[] = new Array(
    this.stripedCacheSize,
  );

  override createCell(row: number, col: number): HTMLCanvasElement | undefined {
    const baseCanvas = super.createCell(row, col);
    if (!baseCanvas || !this.isFirstGroupRow(row)) {
      return baseCanvas;
    }

    const entries = this.collectTimelineEntries(row, col);
    if (this.hasNothingToRender(entries)) {
      return baseCanvas;
    }

    const ctx = baseCanvas.getContext('2d');
    if (!ctx) {
      return baseCanvas;
    }

    const geometry = this.computeCellGeometry();
    if (!geometry) {
      return baseCanvas;
    }

    this.drawAvailability(ctx, entries.availabilityRanges, geometry);
    this.drawTodayBlocks(ctx, entries.todayEntries, geometry);
    this.drawOverflowBlocks(ctx, entries.overflowEntries, geometry);
    this.drawCollisionOverlay(
      ctx,
      entries.todayEntries,
      entries.overflowEntries,
      geometry.width,
      geometry.pixelsPerMinute,
      geometry.displayFromMinutes,
    );

    return baseCanvas;
  }

  private collectTimelineEntries(row: number, col: number): TimelineCellEntries {
    const todayEntries = this.scheduleData
      .getWorkScheduleForCell(row, col)
      .filter((e) => this.isTimelineEntry(e));
    const overflowEntries =
      col > 0
        ? this.scheduleData
            .getWorkScheduleForCell(row, col - 1)
            .filter((e) => this.isTimelineEntry(e) && this.spansMidnight(e))
        : [];
    const availabilityRanges = this.scheduleData.getAvailabilityRangesForCell(row, col);
    return { todayEntries, overflowEntries, availabilityRanges };
  }

  private hasNothingToRender(entries: TimelineCellEntries): boolean {
    return (
      entries.todayEntries.length === 0 &&
      entries.overflowEntries.length === 0 &&
      entries.availabilityRanges.length === 0
    );
  }

  private computeCellGeometry(): TimelineCellGeometry | null {
    const range = this.cachedRange;
    if (range.totalMinutes <= 0) {
      return null;
    }
    const width = this.settings.cellWidth;
    const height = this.settings.cellHeight;
    return {
      width,
      height,
      pixelsPerMinute: height / range.totalMinutes,
      displayFromMinutes: range.displayFromMinutes,
    };
  }

  private drawAvailability(
    ctx: CanvasRenderingContext2D,
    availabilityRanges: { startMinutes: number; endMinutes: number }[],
    geometry: TimelineCellGeometry,
  ): void {
    if (availabilityRanges.length === 0) {
      return;
    }
    this.drawAvailabilityOverlay(
      ctx,
      availabilityRanges,
      geometry.width,
      geometry.pixelsPerMinute,
      geometry.displayFromMinutes,
    );
  }

  private drawTodayBlocks(
    ctx: CanvasRenderingContext2D,
    todayEntries: IScheduleCell[],
    geometry: TimelineCellGeometry,
  ): void {
    for (const entry of todayEntries) {
      const minutes = this.toMinutesRange(entry);
      if (!minutes) {
        continue;
      }
      const endToday = Math.min(minutes.end, this.dayTotalMinutes);
      this.drawEntryBlock(ctx, {
        entry,
        startMinutes: minutes.start,
        endMinutes: endToday,
        width: geometry.width,
        pixelsPerMinute: geometry.pixelsPerMinute,
        displayFromMinutes: geometry.displayFromMinutes,
      });
    }
  }

  private drawOverflowBlocks(
    ctx: CanvasRenderingContext2D,
    overflowEntries: IScheduleCell[],
    geometry: TimelineCellGeometry,
  ): void {
    for (const entry of overflowEntries) {
      const minutes = this.toMinutesRange(entry);
      if (!minutes) {
        continue;
      }
      const overflowEnd = minutes.end - this.dayTotalMinutes;
      this.drawEntryBlock(ctx, {
        entry,
        startMinutes: 0,
        endMinutes: overflowEnd,
        width: geometry.width,
        pixelsPerMinute: geometry.pixelsPerMinute,
        displayFromMinutes: geometry.displayFromMinutes,
      });
    }
  }

  override drawCellTexts(_ctx: CanvasRenderingContext2D, _gridCell: GridCell): void {
    // Timeline renders work entries as time-positioned blocks; cell-level
    // texts from the table view are intentionally suppressed.
  }

  protected override shouldDrawCellBackgroundColor(_gridCell: GridCell): boolean {
    return false;
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

  private getRendererFor(entry: IScheduleCell): ITimelineBlockRenderer | undefined {
    switch (entry.entryType) {
      case WorkScheduleEntryType.Work:
        return this.workRenderer;
      case WorkScheduleEntryType.WorkChange:
        return this.workChangeRenderer;
      case WorkScheduleEntryType.Break:
        return this.breakRenderer;
      default:
        return undefined;
    }
  }

  private drawEntryBlock(ctx: CanvasRenderingContext2D, block: DrawBlockContext): void {
    if (block.endMinutes <= block.startMinutes) {
      return;
    }

    const renderer = this.getRendererFor(block.entry);
    if (!renderer) {
      return;
    }

    const yStart = (block.startMinutes - block.displayFromMinutes) * block.pixelsPerMinute;
    const yEnd = (block.endMinutes - block.displayFromMinutes) * block.pixelsPerMinute;
    const blockHeight = Math.max(this.minBlockHeight, yEnd - yStart);
    const rect = new Rectangle(0, yStart, block.width, yStart + blockHeight);

    const color = renderer.getColor(block.entry);
    renderer.drawShape(ctx, rect, color);

    const label = renderer.getLabel(block.entry);
    if (blockHeight > this.textThreshold && label) {
      this.drawBlockLabel(ctx, rect, label, color);
    }
  }

  private spansMidnight(entry: IScheduleCell): boolean {
    const minutes = this.toMinutesRange(entry);
    return !!minutes && minutes.end > this.dayTotalMinutes;
  }

  private drawAvailabilityOverlay(
    ctx: CanvasRenderingContext2D,
    ranges: { startMinutes: number; endMinutes: number }[],
    width: number,
    pixelsPerMinute: number,
    displayFromMinutes: number,
  ): void {
    ctx.save();
    ctx.fillStyle = this.gridColors.availabilityHighlightColor;
    for (const range of ranges) {
      const y = (range.startMinutes - displayFromMinutes) * pixelsPerMinute;
      const h = (range.endMinutes - range.startMinutes) * pixelsPerMinute;
      if (h > 0) {
        ctx.fillRect(0, y, width, h);
      }
    }
    ctx.restore();
  }

  private drawCollisionOverlay(
    ctx: CanvasRenderingContext2D,
    todayEntries: IScheduleCell[],
    overflowEntries: IScheduleCell[],
    width: number,
    pixelsPerMinute: number,
    displayFromMinutes: number,
  ): void {
    const intervals = this.collectVisibleIntervals(todayEntries, overflowEntries);
    if (intervals.length < 2) {
      return;
    }

    const overlaps = this.computePairwiseOverlaps(intervals);
    if (overlaps.length === 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = this.collisionOverlayAlpha;
    ctx.fillStyle = this.gridColors.warningColor;
    for (const overlap of overlaps) {
      const y = (overlap.start - displayFromMinutes) * pixelsPerMinute;
      const h = (overlap.end - overlap.start) * pixelsPerMinute;
      if (h > 0) {
        ctx.fillRect(0, y, width, h);
      }
    }
    ctx.restore();
  }

  private collectVisibleIntervals(
    todayEntries: IScheduleCell[],
    overflowEntries: IScheduleCell[],
  ): { start: number; end: number }[] {
    const intervals: { start: number; end: number }[] = [];
    for (const entry of todayEntries) {
      const minutes = this.toMinutesRange(entry);
      if (!minutes) continue;
      const end = Math.min(minutes.end, this.dayTotalMinutes);
      if (end > minutes.start) {
        intervals.push({ start: minutes.start, end });
      }
    }
    for (const entry of overflowEntries) {
      const minutes = this.toMinutesRange(entry);
      if (!minutes) continue;
      const end = minutes.end - this.dayTotalMinutes;
      if (end > 0) {
        intervals.push({ start: 0, end });
      }
    }
    return intervals;
  }

  private computePairwiseOverlaps(
    intervals: { start: number; end: number }[],
  ): { start: number; end: number }[] {
    const overlaps: { start: number; end: number }[] = [];
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const start = Math.max(intervals[i].start, intervals[j].start);
        const end = Math.min(intervals[i].end, intervals[j].end);
        if (start < end) {
          overlaps.push({ start, end });
        }
      }
    }
    return overlaps;
  }

  private drawBlockLabel(
    ctx: CanvasRenderingContext2D,
    rect: Rectangle,
    label: string,
    color: string,
  ): void {
    ctx.save();
    ctx.font = `${this.blockLabelFontSize}px ${this.blockLabelFontFamily}`;
    ctx.fillStyle = DrawHelper.getContrastTextColor(color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      label,
      Math.round((rect.left + rect.right) / 2),
      Math.round((rect.top + rect.bottom) / 2),
    );
    ctx.restore();
  }

  private computeDisplayRange() {
    return this.timeRange.calculateDisplayRange(
      this.rangeService.dayStart(),
      this.rangeService.dayEnd(),
      0,
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
    return { start, end: end <= start ? end + this.dayTotalMinutes : end };
  }
}
