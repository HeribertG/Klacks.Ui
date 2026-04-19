// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * PDF export service for the timeline view.
 * Renders one row per client with a 24-hour time ruler and time-positioned
 * Work, WorkChange and Break blocks, replicating the on-screen timeline appearance.
 * @param rowHeight - Fixed height per client row (150 pt ≈ 3 clients per A4-landscape page)
 */
import { Injectable, inject } from '@angular/core';
import { jsPDF, GState } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { SchedulePdfDrawingService, ScheduleDrawingConfig } from './schedule-pdf-drawing.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { WorkBlockRendererService } from '../timeline/renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../timeline/renderers/work-change-block-renderer.service';
import { BreakBlockRendererService } from '../timeline/renderers/break-block-renderer.service';
import { ScheduleDataService } from './schedule-data.service';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';

interface TimelineClientBlock {
  name: string;
  slot1: string;
  slot2: string;
  slot3: string;
  todayEntries: IScheduleCell[][];
  overflowEntries: IScheduleCell[][];
}

@Injectable()
export class TimelinePdfExportService {
  private translateService = inject(TranslateService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService) as ScheduleDataService;
  private appSettingsService = inject(AppSettingsManagementService);
  private gridColorService = inject(GridColorService);
  private gridSettingsService = inject(GridSettingsService);
  private drawingService = inject(SchedulePdfDrawingService);
  private groupSelectionService = inject(GroupSelectionService);
  private workRenderer = inject(WorkBlockRendererService);
  private workChangeRenderer = inject(WorkChangeBlockRendererService);
  private breakRenderer = inject(BreakBlockRendererService);

  private readonly A4_LANDSCAPE = { width: 841.89, height: 595.28 };
  private readonly MARGINS = { top: 40, left: 20, right: 20, bottom: 20 };
  private readonly HEADER_OFFSET = 50;
  private readonly FONT_FAMILY = 'helvetica';
  private readonly FONT_SIZE_TITLE = 14;
  private readonly FONT_SIZE_NORMAL = 9;
  private readonly ROW_HEIGHT = 150;
  private readonly RULER_WIDTH = 28;
  private readonly DAY_TOTAL_MINUTES = 1440;
  private readonly HOURS_PER_DAY = 24;
  private readonly STRIPE_INTERVAL_HOURS = 2;
  private readonly STRIPE_DARK_AMOUNT = 12;
  private readonly MIN_BLOCK_HEIGHT = 2;
  private readonly TEXT_THRESHOLD = 5;
  private readonly RULER_MARK_INTERVAL_HOURS = 2;
  private readonly RULER_TICK_WIDTH = 4;
  private readonly COLLISION_OVERLAY_ALPHA = 0.15;
  private readonly COLLISION_COLOR = '#ff0000';

  exportTimeline(): void {
    const clients = this.dataManagementSchedule.clients;
    if (!clients || clients.length === 0) {
      return;
    }

    const workSettings = this.appSettingsService.workSettings();
    const daysBefore = workSettings.dayVisibleBefore;
    const daysAfter = workSettings.dayVisibleAfter;
    const totalColumns = this.dataService.columns;

    const coreStartCol = daysBefore;
    const coreEndCol = totalColumns - daysAfter - 1;
    const coreDays = coreEndCol - coreStartCol + 1;

    if (coreDays <= 0) {
      return;
    }

    const config = this.drawingService.createDefaultConfig();
    const days = this.buildDayHeaders(coreStartCol, coreDays);
    const clientBlocks = this.buildClientBlocks(coreStartCol, coreDays);

    if (clientBlocks.length === 0) {
      return;
    }

    const availableWidth = this.A4_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;
    const colWidth = (availableWidth - config.rowHeaderWidth) / coreDays;
    const contentStartY = this.MARGINS.top + this.HEADER_OFFSET;

    const pages = this.paginate(clientBlocks, contentStartY, config);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const title = this.buildTitle();
    const totalPages = pages.length;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) {
        pdf.addPage();
      }

      this.addPageHeader(pdf, title, pageIdx + 1, totalPages);

      let currentY = contentStartY;

      this.drawingService.drawColumnHeaders(pdf, this.MARGINS.left, currentY, config, days, colWidth);
      currentY += config.columnHeaderHeight;

      const pageBlocks = pages[pageIdx];

      for (let blockIdx = 0; blockIdx < pageBlocks.length; blockIdx++) {
        const block = pageBlocks[blockIdx];
        const scheduleX = this.MARGINS.left + config.rowHeaderWidth;
        const pixelsPerMinute = this.ROW_HEIGHT / this.DAY_TOTAL_MINUTES;

        this.drawTimelineRowHeader(pdf, this.MARGINS.left, currentY, config, block.name, block.slot1, block.slot2, block.slot3);

        for (let col = 0; col < coreDays; col++) {
          const cellX = scheduleX + col * colWidth;
          this.drawTimelineCellBackground(pdf, cellX, currentY, colWidth, days[col].weekdayType);

          for (const entry of block.overflowEntries[col]) {
            const minutes = this.toMinutesRange(entry);
            if (!minutes) continue;
            const overflowEnd = minutes.end - this.DAY_TOTAL_MINUTES;
            if (overflowEnd > 0) {
              this.drawBlock(pdf, cellX, currentY, colWidth, pixelsPerMinute, entry, 0, overflowEnd);
            }
          }

          for (const entry of block.todayEntries[col]) {
            const minutes = this.toMinutesRange(entry);
            if (!minutes) continue;
            const endToday = Math.min(minutes.end, this.DAY_TOTAL_MINUTES);
            this.drawBlock(pdf, cellX, currentY, colWidth, pixelsPerMinute, entry, minutes.start, endToday);
          }

          this.drawCollisionOverlay(
            pdf, cellX, currentY, colWidth, pixelsPerMinute,
            block.todayEntries[col], block.overflowEntries[col],
          );
        }

        this.drawingService.drawGridLines(
          pdf, scheduleX, currentY, colWidth, coreDays, 1, this.ROW_HEIGHT, config,
        );

        currentY += this.ROW_HEIGHT;

        const isLast = blockIdx === pageBlocks.length - 1;
        this.drawingService.drawRowSeparator(pdf, this.MARGINS.left, currentY, availableWidth, !isLast);
      }
    }

    const fileName = `timeline-schedule-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }

  private buildTitle(): string {
    const filter = this.dataManagementSchedule.workFilter;
    const workSettings = this.appSettingsService.workSettings();
    const groupName = this.groupSelectionService.selectedGroup?.name;
    const groupSuffix = groupName ? ` - ${groupName}` : '';
    const paymentInterval = this.groupSelectionService.selectedGroup?.paymentInterval
      ?? workSettings.paymentInterval;
    const period = this.buildPeriodLabel(paymentInterval, filter);
    return `Timeline - ${period} ${filter.currentYear}${groupSuffix}`;
  }

  private buildPeriodLabel(
    paymentInterval: number,
    filter: { currentMonth: number; currentWeek?: number },
  ): string {
    switch (paymentInterval) {
      case 0:
        return `KW ${filter.currentWeek ?? 1}`;
      case 1: {
        const week = filter.currentWeek ?? 1;
        return `KW ${week}-${week + 1}`;
      }
      case 2:
      default:
        return this.gridSettingsService.monthsName[filter.currentMonth - 1];
    }
  }

  private addPageHeader(pdf: jsPDF, title: string, pageNumber: number, totalPages: number): void {
    pdf.setFontSize(this.FONT_SIZE_TITLE);
    pdf.setFont(this.FONT_FAMILY, 'bold');
    pdf.text(title, this.MARGINS.left, this.MARGINS.top);

    pdf.setFontSize(this.FONT_SIZE_NORMAL);
    pdf.setFont(this.FONT_FAMILY, 'normal');

    const generatedText = this.translateService.instant('pdf.generated');
    const pageText = this.translateService.instant('pdf.page');
    const ofText = this.translateService.instant('pdf.of');

    pdf.text(
      `${generatedText}: ${new Date().toLocaleDateString()}`,
      this.MARGINS.left,
      this.MARGINS.top + 15,
    );
    pdf.text(
      `${pageText} ${pageNumber} ${ofText} ${totalPages}`,
      this.A4_LANDSCAPE.width - this.MARGINS.right - 80,
      this.MARGINS.top + 15,
    );
  }

  private buildDayHeaders(
    coreStartCol: number,
    coreDays: number,
  ): { weekdayName: string; dayOfMonth: number; weekdayType: number }[] {
    const days: { weekdayName: string; dayOfMonth: number; weekdayType: number }[] = [];
    for (let i = 0; i < coreDays; i++) {
      const col = coreStartCol + i;
      const date = this.dataService.getDateForColumn(col);
      days.push({
        weekdayName: this.dataService.weekdayName(col),
        dayOfMonth: date ? date.getDate() : i + 1,
        weekdayType: this.dataService.getWeekday(col),
      });
    }
    return days;
  }

  private buildClientBlocks(coreStartCol: number, coreDays: number): TimelineClientBlock[] {
    const clients = this.dataManagementSchedule.clients;
    const blocks: TimelineClientBlock[] = [];

    for (let clientIdx = 0; clientIdx < clients.length; clientIdx++) {
      const client = clients[clientIdx];
      const clientName = [client.name, client.firstName].filter(Boolean).join(', ');
      const firstRow = this.dataService.indexGroupRow[clientIdx] ?? 0;

      const todayEntries: IScheduleCell[][] = [];
      const overflowEntries: IScheduleCell[][] = [];

      for (let colOffset = 0; colOffset < coreDays; colOffset++) {
        const col = coreStartCol + colOffset;

        todayEntries.push(
          this.dataService.getWorkScheduleForCell(firstRow, col).filter(e => this.isTimelineEntry(e)),
        );

        overflowEntries.push(
          col > 0
            ? this.dataService.getWorkScheduleForCell(firstRow, col - 1)
                .filter(e => this.isTimelineEntry(e) && this.spansMidnight(e))
            : [],
        );
      }

      blocks.push({
        name: clientName,
        slot1: this.dataService.getRowHeaderSlot1Text(clientIdx),
        slot2: this.dataService.getRowHeaderSlot2Text(clientIdx),
        slot3: this.dataService.getRowHeaderSlot3Text(clientIdx),
        todayEntries,
        overflowEntries,
      });
    }

    return blocks;
  }

  private paginate(
    blocks: TimelineClientBlock[],
    contentStartY: number,
    config: ScheduleDrawingConfig,
  ): TimelineClientBlock[][] {
    const availableHeight =
      this.A4_LANDSCAPE.height - this.MARGINS.bottom - contentStartY - config.columnHeaderHeight;

    const pages: TimelineClientBlock[][] = [];
    let currentPage: TimelineClientBlock[] = [];
    let usedHeight = 0;

    for (const block of blocks) {
      if (usedHeight + this.ROW_HEIGHT > availableHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        usedHeight = 0;
      }
      currentPage.push(block);
      usedHeight += this.ROW_HEIGHT;
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
  }

  private drawTimelineRowHeader(
    pdf: jsPDF,
    x: number,
    y: number,
    config: ScheduleDrawingConfig,
    clientName: string,
    slot1: string,
    slot2: string,
    slot3: string,
  ): void {
    const nameAreaWidth = config.rowHeaderWidth - this.RULER_WIDTH;
    const rulerX = x + nameAreaWidth;

    pdf.setFillColor('#f5f5f5');
    pdf.rect(x, y, config.rowHeaderWidth, this.ROW_HEIGHT, 'F');
    pdf.setDrawColor(config.borderColor);
    pdf.setLineWidth(config.lineWidth);
    pdf.rect(x, y, config.rowHeaderWidth, this.ROW_HEIGHT, 'S');

    const textX = x + 4;
    const maxNameWidth = nameAreaWidth - 8;

    pdf.setFont(config.fontFamily, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor('#000000');
    pdf.text(this.truncateText(pdf, clientName, maxNameWidth), textX, y + 9);

    if (slot1 || slot2 || slot3) {
      pdf.setFont(config.fontFamily, 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor('#404040');
      if (slot1) pdf.text(`G: ${slot1}`, textX, y + 18);
      if (slot2) pdf.text(`H: ${slot2}`, textX, y + 26);
      if (slot3) pdf.text(`S: ${slot3}`, textX, y + 34);
    }

    pdf.setDrawColor(config.separatorColor);
    pdf.setLineWidth(0.3);
    pdf.line(rulerX, y, rulerX, y + this.ROW_HEIGHT);

    this.drawRulerMarks(pdf, rulerX, y, config);
  }

  private drawRulerMarks(
    pdf: jsPDF,
    rulerX: number,
    rowY: number,
    config: ScheduleDrawingConfig,
  ): void {
    const pixelsPerMinute = this.ROW_HEIGHT / this.DAY_TOTAL_MINUTES;

    pdf.setFont(config.fontFamily, 'normal');
    pdf.setFontSize(5);
    pdf.setTextColor('#404040');
    pdf.setDrawColor('#999999');
    pdf.setLineWidth(0.3);

    for (let hour = 0; hour <= this.HOURS_PER_DAY; hour++) {
      const markY = rowY + hour * 60 * pixelsPerMinute;
      if (markY > rowY + this.ROW_HEIGHT + 0.5) break;

      const isLabeledHour = hour % this.RULER_MARK_INTERVAL_HOURS === 0;
      const tickLen = isLabeledHour ? this.RULER_TICK_WIDTH : this.RULER_TICK_WIDTH / 2;

      pdf.line(rulerX, markY, rulerX + tickLen, markY);

      if (isLabeledHour) {
        const label = `${String(hour).padStart(2, '0')}:00`;
        pdf.text(label, rulerX + tickLen + 2, markY + 1.5);
      }
    }
  }

  private drawTimelineCellBackground(
    pdf: jsPDF,
    cellX: number,
    cellY: number,
    colWidth: number,
    weekdayType: number,
  ): void {
    const baseColor = this.getBaseColor(weekdayType);
    pdf.setFillColor(baseColor);
    pdf.rect(cellX, cellY, colWidth, this.ROW_HEIGHT, 'F');

    const stripeColor = this.drawingService.darkenColor(baseColor, this.STRIPE_DARK_AMOUNT);
    const pixelsPerMinute = this.ROW_HEIGHT / this.DAY_TOTAL_MINUTES;

    pdf.setFillColor(stripeColor);
    for (let hour = 0; hour < this.HOURS_PER_DAY; hour += this.STRIPE_INTERVAL_HOURS) {
      const yStart = cellY + hour * 60 * pixelsPerMinute;
      const stripeHeight = 60 * pixelsPerMinute;
      pdf.rect(cellX, yStart, colWidth, stripeHeight, 'F');
    }
  }

  private drawBlock(
    pdf: jsPDF,
    cellX: number,
    cellY: number,
    colWidth: number,
    pixelsPerMinute: number,
    entry: IScheduleCell,
    startMinutes: number,
    endMinutes: number,
  ): void {
    if (endMinutes <= startMinutes) return;

    const renderer = this.getRendererFor(entry);
    if (!renderer) return;

    const yStart = cellY + startMinutes * pixelsPerMinute;
    const blockHeight = Math.max(this.MIN_BLOCK_HEIGHT, (endMinutes - startMinutes) * pixelsPerMinute);
    const color = renderer.getColor(entry);

    pdf.setFillColor(color);
    pdf.rect(cellX, yStart, colWidth, blockHeight, 'F');

    if (blockHeight >= this.TEXT_THRESHOLD) {
      const label = renderer.getLabel(entry);
      if (label) {
        pdf.setFont(this.FONT_FAMILY, 'bold');
        pdf.setFontSize(5);
        pdf.setTextColor(this.getContrastTextColor(color));
        const textWidth = pdf.getTextWidth(label);
        pdf.text(label, cellX + (colWidth - textWidth) / 2, yStart + blockHeight / 2 + 1.5);
      }
    }
  }

  private getRendererFor(entry: IScheduleCell) {
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

  private isTimelineEntry(entry: IScheduleCell): boolean {
    return (
      entry.entryType === WorkScheduleEntryType.Work ||
      entry.entryType === WorkScheduleEntryType.WorkChange ||
      entry.entryType === WorkScheduleEntryType.Break
    );
  }

  private spansMidnight(entry: IScheduleCell): boolean {
    const minutes = this.toMinutesRange(entry);
    return !!minutes && minutes.end > this.DAY_TOTAL_MINUTES;
  }

  private toMinutesRange(entry: IScheduleCell): { start: number; end: number } | undefined {
    if (!entry.startTime || !entry.endTime) return undefined;
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    if (!start && !entry.startTime.startsWith('00')) return undefined;
    return { start, end: end <= start ? end + this.DAY_TOTAL_MINUTES : end };
  }

  private getBaseColor(weekdayType: number): string {
    switch (weekdayType) {
      case WeekDaysEnum.Saturday:
        return this.gridColorService.backGroundColorSaturday;
      case WeekDaysEnum.Sunday:
        return this.gridColorService.backGroundColorSunday;
      case WeekDaysEnum.Holiday:
        return this.gridColorService.backGroundColorHolyday;
      case WeekDaysEnum.OfficiallyHoliday:
        return this.gridColorService.backGroundColorOfficiallyHoliday;
      default:
        return this.gridColorService.backGroundColor;
    }
  }

  private getContrastTextColor(hexColor: string): string {
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  private drawCollisionOverlay(
    pdf: jsPDF,
    cellX: number,
    cellY: number,
    colWidth: number,
    pixelsPerMinute: number,
    todayEntries: IScheduleCell[],
    overflowEntries: IScheduleCell[],
  ): void {
    const intervals = this.collectVisibleIntervals(todayEntries, overflowEntries);
    if (intervals.length < 2) return;

    const overlaps = this.computePairwiseOverlaps(intervals);
    if (overlaps.length === 0) return;

    pdf.setGState(new GState({ opacity: this.COLLISION_OVERLAY_ALPHA }));
    pdf.setFillColor(this.COLLISION_COLOR);
    for (const overlap of overlaps) {
      const yStart = cellY + overlap.start * pixelsPerMinute;
      const height = (overlap.end - overlap.start) * pixelsPerMinute;
      if (height > 0) {
        pdf.rect(cellX, yStart, colWidth, height, 'F');
      }
    }
    pdf.setGState(new GState({ opacity: 1 }));
  }

  private collectVisibleIntervals(
    todayEntries: IScheduleCell[],
    overflowEntries: IScheduleCell[],
  ): { start: number; end: number }[] {
    const intervals: { start: number; end: number }[] = [];
    for (const entry of todayEntries) {
      const m = this.toMinutesRange(entry);
      if (!m) continue;
      const end = Math.min(m.end, this.DAY_TOTAL_MINUTES);
      if (end > m.start) intervals.push({ start: m.start, end });
    }
    for (const entry of overflowEntries) {
      const m = this.toMinutesRange(entry);
      if (!m) continue;
      const end = m.end - this.DAY_TOTAL_MINUTES;
      if (end > 0) intervals.push({ start: 0, end });
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
        if (start < end) overlaps.push({ start, end });
      }
    }
    return overlaps;
  }

  private truncateText(pdf: jsPDF, text: string, maxWidth: number): string {
    if (pdf.getTextWidth(text) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && pdf.getTextWidth(truncated + '...') > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }
}
