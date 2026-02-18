import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { BaseCanvasManagerService } from 'src/app/presentation/shared/grid/services/body/canvas-manager.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ScheduleDataService } from './schedule-data.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

interface BreakBarLayout {
  bp: IBreakPlaceholder;
  startCol: number;
  endCol: number;
  subRow: number;
}

@Injectable()
export class ScheduleBreakBarRenderService {
  private dataService = inject(BaseDataService) as ScheduleDataService;
  private settings = inject(BaseSettingsService);
  private absenceLookup = inject(AbsenceLookupService);
  private canvasManager = inject(BaseCanvasManagerService);
  private scroll = inject(ScrollService);
  private translateService = inject(TranslateService);
  private gridFonts = inject(GridFontsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private lastRenderedLayouts = new Map<number, BreakBarLayout[]>();

  renderBreakBars(ctx: CanvasRenderingContext2D): void {
    this.lastRenderedLayouts.clear();
    if (!this.dataManagementSchedule.showBreakPlaceholders()) return;
    if (!this.dataService.startDate) return;

    const firstVisibleRow = this.scroll.verticalScrollPosition;
    const firstVisibleCol = this.scroll.horizontalScrollPosition;
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    const cellHeaderHeight = this.settings.hasHeader ? this.settings.cellHeaderHeight : 0;
    const canvasWidth = this.canvasManager.canvas?.width ?? 0;
    const canvasHeight = this.canvasManager.canvas?.height ?? 0;
    const language = this.translateService.currentLang || 'en';

    const totalColumns = this.dataService.columns;
    const totalRows = this.dataService.rows;
    const visibleRows = Math.ceil((canvasHeight - cellHeaderHeight) / cellHeight);
    const visibleCols = Math.ceil(canvasWidth / cellWidth);
    const lastVisibleRow = firstVisibleRow + visibleRows;
    const lastVisibleCol = firstVisibleCol + visibleCols;
    const maxDataWidth = (totalColumns - firstVisibleCol) * cellWidth;
    const clipWidth = Math.min(canvasWidth, maxDataWidth);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, cellHeaderHeight, clipWidth, canvasHeight - cellHeaderHeight);
    ctx.clip();

    const clientCount = this.dataService.indexGroupRow.length;

    for (let clientIndex = 0; clientIndex < clientCount; clientIndex++) {
      const neededRows = this.dataService.getNeededRowsForClient(clientIndex);
      const displayRows = this.dataService.getDisplayRowsForClient(clientIndex);

      if (displayRows <= neededRows) continue;

      const clientStartRow = this.dataService.indexGroupRow[clientIndex];
      const breakRowStart = clientStartRow + neededRows;
      const breakRowEnd = clientStartRow + displayRows - 1;

      if (breakRowStart > lastVisibleRow || breakRowEnd < firstVisibleRow) continue;

      const breakPlaceholders = this.dataService.getBreakPlaceholdersForClient(clientIndex);
      if (!breakPlaceholders.length) continue;

      const layouts = this.assignSubRows(breakPlaceholders);
      this.lastRenderedLayouts.set(clientIndex, layouts);

      for (const layout of layouts) {
        const clampedStartCol = Math.max(layout.startCol, firstVisibleCol);
        const clampedEndCol = Math.min(layout.endCol, lastVisibleCol, totalColumns - 1);
        if (clampedStartCol > clampedEndCol) continue;

        const gridRow = breakRowStart + layout.subRow;
        if (gridRow < firstVisibleRow || gridRow > lastVisibleRow) continue;

        const x = (clampedStartCol - firstVisibleCol) * cellWidth;
        const y = (gridRow - firstVisibleRow) * cellHeight + cellHeaderHeight;
        const width = (clampedEndCol - clampedStartCol + 1) * cellWidth;

        const color = this.absenceLookup.getColorForEntryId(layout.bp.absenceId);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = color || '#999999';

        const barPadding = 2;
        ctx.fillRect(x + 1, y + barPadding, width - 2, cellHeight - barPadding * 2);

        const abbreviation = this.absenceLookup.getAbbreviationForEntryId(layout.bp.absenceId, language);
        if (abbreviation) {
          const textX = x + width / 2;
          const textY = y + cellHeight / 2;

          ctx.fillStyle = '#000000';
          ctx.font = this.gridFonts.mainFontStringZoom;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(abbreviation, textX, textY);
        }
        ctx.globalAlpha = 1.0;
      }
    }

    ctx.restore();
  }

  private assignSubRows(breakPlaceholders: IBreakPlaceholder[]): BreakBarLayout[] {
    if (!this.dataService.startDate) return [];

    const startDate = this.dataService.startDate;
    const sorted = [...breakPlaceholders]
      .filter((bp) => bp.from && bp.until)
      .sort((a, b) => new Date(a.from!).getTime() - new Date(b.from!).getTime());

    const layouts: BreakBarLayout[] = [];
    const subRowEnds: number[] = [];

    for (const bp of sorted) {
      const startCol = this.daysBetween(startDate, new Date(bp.from!));
      const endCol = this.daysBetween(startDate, new Date(bp.until!));

      let assignedRow = -1;
      for (let i = 0; i < subRowEnds.length; i++) {
        if (subRowEnds[i] < startCol) {
          assignedRow = i;
          break;
        }
      }

      if (assignedRow === -1) {
        assignedRow = subRowEnds.length;
        subRowEnds.push(endCol);
      } else {
        subRowEnds[assignedRow] = endCol;
      }

      layouts.push({ bp, startCol, endCol, subRow: assignedRow });
    }

    return layouts;
  }

  getBreakPlaceholderAt(row: number, col: number): IBreakPlaceholder | null {
    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return null;

    const clientStartRow = this.dataService.indexGroupRow[clientIndex];
    const neededRows = this.dataService.getNeededRowsForClient(clientIndex);
    const displayRows = this.dataService.getDisplayRowsForClient(clientIndex);

    if (displayRows <= neededRows) return null;

    const rowWithinClient = row - clientStartRow;
    if (rowWithinClient < neededRows) return null;

    const subRow = rowWithinClient - neededRows;
    const layouts = this.lastRenderedLayouts.get(clientIndex);
    if (!layouts) return null;

    const hit = layouts.find(l => l.subRow === subRow && col >= l.startCol && col <= l.endCol);
    return hit?.bp ?? null;
  }

  private daysBetween(start: Date, end: Date): number {
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  }
}
