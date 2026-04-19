// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleDataService } from './schedule-data.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { SchedulePdfDrawingService, ScheduleDrawingConfig } from './schedule-pdf-drawing.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';

@Injectable()
export class SchedulePdfExportService {
  private translateService = inject(TranslateService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService) as ScheduleDataService;
  private appSettingsService = inject(AppSettingsManagementService);
  private gridColorService = inject(GridColorService);
  private gridSettingsService = inject(GridSettingsService);
  private drawingService = inject(SchedulePdfDrawingService);
  private groupSelectionService = inject(GroupSelectionService);

  private readonly A4_LANDSCAPE = {
    width: 841.89,
    height: 595.28,
  };

  private readonly MARGINS = {
    top: 40,
    left: 20,
    right: 20,
    bottom: 20,
  };

  private readonly HEADER_OFFSET = 50;
  private readonly FONT_FAMILY = 'helvetica';
  private readonly FONT_SIZE_TITLE = 14;
  private readonly FONT_SIZE_NORMAL = 9;

  private get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  exportSchedule(): void {
    const config = this.drawingService.createDefaultConfig();
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

    const days = this.buildDayHeaders(coreStartCol, coreDays);

    const availableWidth = this.A4_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;
    const colWidth = (availableWidth - config.rowHeaderWidth) / coreDays;

    const contentStartY = this.MARGINS.top + this.HEADER_OFFSET;

    const clientBlocks = this.buildClientBlocks(coreStartCol, coreDays, config);
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

      this.drawingService.drawColumnHeaders(
        pdf,
        this.MARGINS.left,
        currentY,
        config,
        days,
        colWidth,
      );

      currentY += config.columnHeaderHeight;

      const pageClients = pages[pageIdx];

      for (let blockIdx = 0; blockIdx < pageClients.length; blockIdx++) {
        const block = pageClients[blockIdx];
        const blockHeight = block.subRows.length * config.subRowHeight;

        this.drawingService.drawRowHeader(
          pdf,
          this.MARGINS.left,
          currentY,
          config,
          blockHeight,
          block.name,
          block.slot1,
          block.slot2,
          block.slot3,
        );

        const scheduleX = this.isRtl ? this.MARGINS.left : this.MARGINS.left + config.rowHeaderWidth;

        for (let col = 0; col < coreDays; col++) {
          const dayIdx = this.isRtl ? coreDays - 1 - col : col;
          const cellX = scheduleX + col * colWidth;
          this.drawingService.drawDayBackground(
            pdf,
            cellX,
            currentY,
            colWidth,
            blockHeight,
            days[dayIdx].weekdayType,
          );
        }

        for (let subRowIdx = 0; subRowIdx < block.subRows.length; subRowIdx++) {
          const subRow = block.subRows[subRowIdx];
          const subRowY = currentY + subRowIdx * config.subRowHeight;

          for (let col = 0; col < coreDays; col++) {
            const dayIdx = this.isRtl ? coreDays - 1 - col : col;
            const cellData = subRow[dayIdx];
            if (!cellData) continue;

            const cellX = scheduleX + col * colWidth;

            if (cellData.sealed && !cellData.backgroundColor) {
              const dayBg = this.drawingService.darkenColor('#ffffff', 30);
              pdf.setFillColor(dayBg);
              pdf.rect(cellX, subRowY, colWidth, config.subRowHeight, 'F');
            }

            if (!cellData.isEmpty) {
              this.drawingService.drawCellContent(
                pdf,
                cellX,
                subRowY,
                colWidth,
                config.subRowHeight,
                cellData.mainText,
                '',
                '',
                cellData.backgroundColor,
                cellData.fontColor,
              );
            }
          }
        }

        this.drawingService.drawGridLines(
          pdf,
          scheduleX,
          currentY,
          colWidth,
          coreDays,
          block.subRows.length,
          blockHeight,
          config,
        );

        currentY += blockHeight;

        const isLast = blockIdx === pageClients.length - 1;
        this.drawingService.drawRowSeparator(
          pdf,
          this.MARGINS.left,
          currentY,
          availableWidth,
          !isLast,
        );
      }
    }

    const fileName = `schedule-${new Date().getTime()}.pdf`;
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
    return `Einsatzplan - ${period} ${filter.currentYear}${groupSuffix}`;
  }

  private buildPeriodLabel(paymentInterval: number, filter: { currentMonth: number; currentWeek?: number }): string {
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

  private addPageHeader(
    pdf: jsPDF,
    title: string,
    pageNumber: number,
    totalPages: number,
  ): void {
    pdf.setFontSize(this.FONT_SIZE_TITLE);
    pdf.setFont(this.FONT_FAMILY, 'bold');

    if (this.isRtl) {
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, this.A4_LANDSCAPE.width - this.MARGINS.right - titleWidth, this.MARGINS.top);
    } else {
      pdf.text(title, this.MARGINS.left, this.MARGINS.top);
    }

    pdf.setFontSize(this.FONT_SIZE_NORMAL);
    pdf.setFont(this.FONT_FAMILY, 'normal');

    const generatedText = this.translateService.instant('pdf.generated');
    const pageText = this.translateService.instant('pdf.page');
    const ofText = this.translateService.instant('pdf.of');

    const dateString = `${generatedText}: ${new Date().toLocaleDateString()}`;
    const pageString = `${pageText} ${pageNumber} ${ofText} ${totalPages}`;

    if (this.isRtl) {
      const dateWidth = pdf.getTextWidth(dateString);
      pdf.text(dateString, this.A4_LANDSCAPE.width - this.MARGINS.right - dateWidth, this.MARGINS.top + 15);
      pdf.text(pageString, this.MARGINS.left, this.MARGINS.top + 15);
    } else {
      pdf.text(dateString, this.MARGINS.left, this.MARGINS.top + 15);
      pdf.text(
        pageString,
        this.A4_LANDSCAPE.width - this.MARGINS.right - 80,
        this.MARGINS.top + 15,
      );
    }
  }

  private buildDayHeaders(
    coreStartCol: number,
    coreDays: number,
  ): { weekdayName: string; dayOfMonth: number; weekdayType: number }[] {
    const days: { weekdayName: string; dayOfMonth: number; weekdayType: number }[] = [];

    for (let i = 0; i < coreDays; i++) {
      const col = coreStartCol + i;
      const date = this.dataService.getDateForColumn(col);
      const weekdayName = this.dataService.weekdayName(col);
      const weekdayType = this.dataService.getWeekday(col);

      days.push({
        weekdayName,
        dayOfMonth: date ? date.getDate() : i + 1,
        weekdayType,
      });
    }

    return days;
  }

  private buildClientBlocks(
    coreStartCol: number,
    coreDays: number,
    _config: ScheduleDrawingConfig,
  ): ClientBlock[] {
    const clients = this.dataManagementSchedule.clients;
    const blocks: ClientBlock[] = [];

    let currentRow = 0;

    for (let clientIdx = 0; clientIdx < clients.length; clientIdx++) {
      const client = clients[clientIdx];
      const neededRows = client.neededRows;

      const clientName = [client.name, client.firstName].filter(Boolean).join(', ');

      const slot1 = this.dataService.getRowHeaderSlot1Text(clientIdx);
      const slot2 = this.dataService.getRowHeaderSlot2Text(clientIdx);
      const slot3 = this.dataService.getRowHeaderSlot3Text(clientIdx);

      const subRows: CellData[][] = [];

      for (let subRow = 0; subRow < neededRows; subRow++) {
        const row = currentRow + subRow;
        const rowCells: CellData[] = [];

        for (let colOffset = 0; colOffset < coreDays; colOffset++) {
          const col = coreStartCol + colOffset;
          const cell = this.dataService.getCell(row, col);

          let backgroundColor = cell.backgroundColor;
          if (cell.sealed && backgroundColor) {
            backgroundColor = this.drawingService.darkenColor(backgroundColor, 30);
          }

          rowCells.push({
            mainText: cell.mainText,
            firstSubText: cell.firstSubText,
            secondSubText: cell.secondSubText,
            backgroundColor,
            fontColor: cell.fontColor,
            isEmpty: cell.isEmpty(),
            sealed: cell.sealed,
          });
        }

        subRows.push(rowCells);
      }

      blocks.push({
        name: clientName,
        slot1,
        slot2,
        slot3,
        subRows,
        neededRows,
      });

      currentRow += neededRows;
    }

    return blocks;
  }

  private paginate(
    blocks: ClientBlock[],
    contentStartY: number,
    config: ScheduleDrawingConfig,
  ): ClientBlock[][] {
    const availableHeight =
      this.A4_LANDSCAPE.height - this.MARGINS.bottom - contentStartY - config.columnHeaderHeight;

    const pages: ClientBlock[][] = [];
    let currentPage: ClientBlock[] = [];
    let usedHeight = 0;

    for (const block of blocks) {
      const blockHeight = block.subRows.length * config.subRowHeight;

      if (usedHeight + blockHeight > availableHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        usedHeight = 0;
      }

      currentPage.push(block);
      usedHeight += blockHeight;
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
  }
}

interface CellData {
  mainText: string;
  firstSubText: string;
  secondSubText: string;
  backgroundColor?: string;
  fontColor?: string;
  isEmpty: boolean;
  sealed: boolean;
}

interface ClientBlock {
  name: string;
  slot1: string;
  slot2: string;
  slot3: string;
  subRows: CellData[][];
  neededRows: number;
}
