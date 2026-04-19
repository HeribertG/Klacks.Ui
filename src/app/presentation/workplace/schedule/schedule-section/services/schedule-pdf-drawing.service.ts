// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

export interface ScheduleDrawingConfig {
  pageWidth: number;
  pageHeight: number;
  rowHeaderWidth: number;
  subRowHeight: number;
  columnHeaderHeight: number;
  marginLeft: number;
  marginRight: number;
  borderColor: string;
  separatorColor: string;
  lineWidth: number;
  fontFamily: string;
}

@Injectable()
export class SchedulePdfDrawingService {
  private gridColorService = inject(GridColorService);

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  createDefaultConfig(): ScheduleDrawingConfig {
    return {
      pageWidth: 841.89,
      pageHeight: 595.28,
      rowHeaderWidth: 120,
      subRowHeight: 14,
      columnHeaderHeight: 22,
      marginLeft: 20,
      marginRight: 20,
      borderColor: '#888888',
      separatorColor: '#cccccc',
      lineWidth: 0.5,
      fontFamily: 'helvetica',
    };
  }

  drawColumnHeaders(
    pdf: jsPDF,
    x: number,
    y: number,
    config: ScheduleDrawingConfig,
    days: { weekdayName: string; dayOfMonth: number; weekdayType: number }[],
    colWidth: number,
  ): void {
    const headerX = this.isRtl ? x : x + config.rowHeaderWidth;

    pdf.setFontSize(7);
    pdf.setFont(config.fontFamily, 'bold');

    for (let i = 0; i < days.length; i++) {
      const dayIdx = this.isRtl ? days.length - 1 - i : i;
      const day = days[dayIdx];
      const cellX = headerX + i * colWidth;

      pdf.setFillColor('#f5f5f5');
      pdf.rect(cellX, y, colWidth, config.columnHeaderHeight, 'F');

      pdf.setDrawColor(config.separatorColor);
      pdf.setLineWidth(config.lineWidth);
      pdf.line(cellX, y, cellX, y + config.columnHeaderHeight);

      pdf.setTextColor('#000000');
      const label = `${day.weekdayName} ${day.dayOfMonth}`;
      const textWidth = pdf.getTextWidth(label);
      const textX = cellX + (colWidth - textWidth) / 2;
      pdf.text(label, textX, y + config.columnHeaderHeight / 2 + 2);
    }

    const totalWidth = days.length * colWidth;
    pdf.setDrawColor(config.borderColor);
    pdf.setLineWidth(config.lineWidth);
    pdf.rect(headerX, y, totalWidth, config.columnHeaderHeight, 'S');
  }

  drawRowHeader(
    pdf: jsPDF,
    x: number,
    y: number,
    config: ScheduleDrawingConfig,
    height: number,
    name: string,
    slot1: string,
    slot2: string,
    slot3: string,
  ): void {
    const availableWidth = config.pageWidth - config.marginLeft - config.marginRight;
    const headerX = this.isRtl ? x + availableWidth - config.rowHeaderWidth : x;

    pdf.setFillColor('#f5f5f5');
    pdf.rect(headerX, y, config.rowHeaderWidth, height, 'F');

    pdf.setDrawColor(config.borderColor);
    pdf.setLineWidth(config.lineWidth);
    pdf.rect(headerX, y, config.rowHeaderWidth, height, 'S');

    const centerY = y + height / 2;
    const hasSlots = !!(slot1 || slot2 || slot3);

    pdf.setFont(config.fontFamily, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor('#000000');

    const maxNameWidth = config.rowHeaderWidth - 8;
    const truncatedName = this.truncateText(pdf, name, maxNameWidth);

    if (this.isRtl) {
      const nameWidth = pdf.getTextWidth(truncatedName);
      const nameX = headerX + config.rowHeaderWidth - 4 - nameWidth;
      pdf.text(truncatedName, nameX, hasSlots ? centerY - 5 : centerY + 2);

      if (hasSlots) {
        pdf.setFont(config.fontFamily, 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor('#404040');

        const baseX = headerX + config.rowHeaderWidth - 4;
        if (slot1) {
          pdf.text(slot1, baseX - pdf.getTextWidth(slot1), centerY + 2);
        }
        if (slot2) {
          pdf.text(slot2, baseX - 30 - pdf.getTextWidth(slot2), centerY + 2);
        }
        if (slot3) {
          pdf.text(slot3, baseX - 60 - pdf.getTextWidth(slot3), centerY + 2);
        }
      }
    } else {
      const nameX = headerX + 4;
      pdf.text(truncatedName, nameX, hasSlots ? centerY - 5 : centerY + 2);

      if (hasSlots) {
        pdf.setFont(config.fontFamily, 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor('#404040');

        if (slot1) {
          pdf.text(slot1, nameX, centerY + 2);
        }
        if (slot2) {
          pdf.text(slot2, nameX + 30, centerY + 2);
        }
        if (slot3) {
          pdf.text(slot3, nameX + 60, centerY + 2);
        }
      }
    }
  }

  drawCellContent(
    pdf: jsPDF,
    cellX: number,
    cellY: number,
    colWidth: number,
    subRowHeight: number,
    mainText: string,
    firstSubText: string,
    secondSubText: string,
    backgroundColor?: string,
    fontColor?: string,
  ): void {
    if (backgroundColor) {
      pdf.setFillColor(backgroundColor);
      pdf.rect(cellX, cellY, colWidth, subRowHeight, 'F');
    }

    const textColor = fontColor || '#000000';
    pdf.setTextColor(textColor);

    if (mainText) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      const textWidth = pdf.getTextWidth(mainText);
      const textX = cellX + (colWidth - textWidth) / 2;
      const textY = cellY + subRowHeight / 2 + 2;
      pdf.text(mainText, textX, textY);
    }

    if (firstSubText) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5);
      const textWidth = pdf.getTextWidth(firstSubText);
      const textX = cellX + (colWidth - textWidth) / 2;
      pdf.text(firstSubText, textX, cellY + 9.5);
    }

    if (secondSubText) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5);
      const textWidth = pdf.getTextWidth(secondSubText);
      const textX = cellX + (colWidth - textWidth) / 2;
      pdf.text(secondSubText, textX, cellY + 12.5);
    }
  }

  drawDayBackground(
    pdf: jsPDF,
    cellX: number,
    cellY: number,
    colWidth: number,
    height: number,
    weekdayType: number,
  ): void {
    const bgColor = this.getWeekdayBackgroundColor(weekdayType);
    pdf.setFillColor(bgColor);
    pdf.rect(cellX, cellY, colWidth, height, 'F');
  }

  drawRowSeparator(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    thick: boolean,
  ): void {
    pdf.setDrawColor(thick ? '#888888' : '#cccccc');
    pdf.setLineWidth(thick ? 1.0 : 0.3);
    pdf.line(x, y, x + width, y);
  }

  drawGridLines(
    pdf: jsPDF,
    startX: number,
    startY: number,
    colWidth: number,
    numCols: number,
    numRows: number,
    height: number,
    config: ScheduleDrawingConfig,
  ): void {
    const subRowHeight = numRows > 0 ? height / numRows : height;
    const totalWidth = numCols * colWidth;

    pdf.setDrawColor(config.separatorColor);
    pdf.setLineWidth(0.2);

    for (let i = 0; i <= numCols; i++) {
      const lineX = startX + i * colWidth;
      pdf.line(lineX, startY, lineX, startY + height);
    }

    for (let i = 1; i < numRows; i++) {
      const lineY = startY + i * subRowHeight;
      pdf.line(startX, lineY, startX + totalWidth, lineY);
    }

    pdf.setDrawColor(config.borderColor);
    pdf.setLineWidth(config.lineWidth);
    pdf.rect(startX, startY, totalWidth, height, 'S');
  }

  darkenColor(color: string, amount: number): string {
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = Math.max(parseInt(hex.substring(0, 2), 16) - amount, 0);
    const g = Math.max(parseInt(hex.substring(2, 4), 16) - amount, 0);
    const b = Math.max(parseInt(hex.substring(4, 6), 16) - amount, 0);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private getWeekdayBackgroundColor(weekdayType: number): string {
    switch (weekdayType) {
      case 1:
        return this.gridColorService.backGroundColorSaturday;
      case 2:
        return this.gridColorService.backGroundColorSunday;
      case 3:
        return this.gridColorService.backGroundColorHolyday;
      case 4:
        return this.gridColorService.backGroundColorOfficiallyHoliday;
      default:
        return '#ffffff';
    }
  }

  private truncateText(pdf: jsPDF, text: string, maxWidth: number): string {
    if (pdf.getTextWidth(text) <= maxWidth) {
      return text;
    }
    let truncated = text;
    while (truncated.length > 0 && pdf.getTextWidth(truncated + '...') > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }
}
