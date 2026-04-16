// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Cell renderer for the timeline view.
 * Draws Work / WorkChange / Break / Expenses entries as colored 3D blocks on a
 * vertical 00:00-24:00 axis. ScheduleNote and ScheduleCommand entries are skipped.
 * Only the first row of each client group carries the block visualisation; the
 * remaining rows of the group render empty backgrounds so the layout stays clean
 * even when the underlying data structure still carries multiple rows per client.
 * @param scheduleData - Mapping from (row, col) to the actual work-schedule entries
 * @param timeRangeService - Shared time-axis math (used for both the ruler and the blocks)
 * @param timeRulerRender - Padding policy for the time ruler, kept in sync with the row-header
 */
import { inject, Injectable } from '@angular/core';
import { BaseCreateCellService } from 'src/app/presentation/shared/grid/services/body/create-cell.service';
import {
  IScheduleCell,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ScheduleDataService } from '../../services/schedule-data.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { TimeRulerRenderService } from 'src/app/presentation/shared/time-ruler/services/time-ruler-render.service';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';

@Injectable()
export class TimelineCreateCellService extends BaseCreateCellService {
  private scheduleData = inject(BaseDataService) as ScheduleDataService;
  private timeRulerRender = inject(TimeRulerRenderService);
  private timeRange = inject(TimeRangeService);

  private readonly dayStart = OwnTime.forTime('00', '00');
  private readonly dayEnd = OwnTime.forTime('24', '00');
  private readonly blockMarginX = 4;
  private readonly blockBorderDepth = 2;
  private readonly textThreshold = 15;
  private readonly textFont = '10px Arial';

  private cachedRange = this.computeDisplayRange();

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
      entry.entryType === WorkScheduleEntryType.Break ||
      entry.entryType === WorkScheduleEntryType.Expenses
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

    const blockWidth = Math.max(1, width - this.blockMarginX * 2);
    const color = this.resolveBlockColor(entry.entryType);
    const rect = new Rectangle(
      this.blockMarginX,
      yStart,
      this.blockMarginX + blockWidth,
      yStart + blockHeight,
    );

    DrawHelper.fillRectangle(ctx, color, rect);
    DrawHelper.drawBorder(
      ctx,
      this.blockMarginX,
      yStart,
      blockWidth,
      blockHeight,
      color,
      this.blockBorderDepth,
      Gradient3DBorderStyleEnum.Raised,
    );

    if (blockHeight > this.textThreshold && entry.abbreviation) {
      ctx.save();
      ctx.font = this.textFont;
      ctx.fillStyle = this.gridColors.mainFontColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.abbreviation, width / 2, yStart + blockHeight / 2);
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

  private resolveBlockColor(entryType: WorkScheduleEntryType): string {
    switch (entryType) {
      case WorkScheduleEntryType.Break:
        return this.gridColors.backGroundColorHolyday;
      case WorkScheduleEntryType.Expenses:
      case WorkScheduleEntryType.WorkChange:
        return this.gridColors.workChangeColor;
      default:
        return this.gridColors.controlBackGroundColor;
    }
  }
}
