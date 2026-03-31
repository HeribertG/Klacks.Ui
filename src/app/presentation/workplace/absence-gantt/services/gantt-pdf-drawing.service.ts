// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';
import { HolidaysListHelper } from 'src/app/domain/models/calendar/calendar-rule-class';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { Absence } from 'src/app/domain/models/absence/absence-class';

export interface GanttDrawingConfig {
  pageWidth: number;
  pageHeight: number;
  rowHeaderWidth: number;
  rowHeight: number;
  year: number;
  startDate: Date;
  evenMonthColor: string;
  oddMonthColor: string;
  weekendColor: string;
  dayLineColor: string;
  monthBorderColor: string;
  lineWidth: number;
}

export interface RowDrawingParams {
  x: number;
  y: number;
  pdf: jsPDF;
  config: GanttDrawingConfig;
}

@Injectable()
export class GanttPdfDrawingService {
  private translateService = inject(TranslateService);
  private holidaysHelper = new HolidaysListHelper();
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  private mirrorX(calendarStartX: number, calendarWidth: number, ltrX: number, elementWidth: number): number {
    if (this.isRtl) {
      return calendarStartX + calendarWidth - (ltrX - calendarStartX) - elementWidth;
    }
    return ltrX;
  }

  /**
   * Draws the background of a row with monthly backgrounds and day lines
   * @param params - Drawing parameters with position and configuration
   */
  drawRowBackground(params: RowDrawingParams): void {
    const { x, y, pdf, config } = params;

    const availableCalendarWidth = this.getCalendarWidth(config);
    const daysInYear = this.getDaysInYear(config.year);
    const dayWidth = availableCalendarWidth / daysInYear;
    const calendarStartX = this.getCalendarStartX(x, config);

    let currentX = calendarStartX;
    const monthOrder = this.isRtl ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    for (const month of monthOrder) {
      const daysInMonth = this.getDaysInMonth(config.year, month);
      const monthWidth = daysInMonth * dayWidth;

      const isEvenMonth = month % 2 === 0;
      const backgroundColor = isEvenMonth
        ? config.evenMonthColor
        : config.oddMonthColor;

      pdf.setFillColor(backgroundColor);
      pdf.rect(currentX, y, monthWidth, config.rowHeight, 'F');

      currentX += monthWidth;
    }

    this.drawWeekendBackgrounds(
      pdf,
      calendarStartX,
      y,
      availableCalendarWidth,
      config.rowHeight,
      config
    );

    currentX = calendarStartX;

    for (const month of monthOrder) {
      const daysInMonth = this.getDaysInMonth(config.year, month);
      const monthWidth = daysInMonth * dayWidth;

      this.drawDayLines(
        pdf,
        currentX,
        y,
        monthWidth,
        config.rowHeight,
        daysInMonth,
        config
      );

      pdf.setDrawColor(config.monthBorderColor);
      pdf.setLineWidth(config.lineWidth * 2);
      pdf.line(
        currentX + monthWidth,
        y,
        currentX + monthWidth,
        y + config.rowHeight
      );

      currentX += monthWidth;
    }
  }

  private drawWeekendBackgrounds(
    pdf: jsPDF,
    startX: number,
    startY: number,
    calendarWidth: number,
    rowHeight: number,
    config: GanttDrawingConfig
  ): void {
    const daysInYear = this.getDaysInYear(config.year);
    const dayWidth = calendarWidth / daysInYear;

    const currentDate = new Date(config.year, 0, 1);

    pdf.setFillColor(config.weekendColor);

    for (let dayOfYear = 0; dayOfYear < daysInYear; dayOfYear++) {
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const ltrX = startX + dayOfYear * dayWidth;
        const xPos = this.mirrorX(startX, calendarWidth, ltrX, dayWidth);
        pdf.rect(xPos, startY, dayWidth, rowHeight, 'F');
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  private drawDayLines(
    pdf: jsPDF,
    startX: number,
    startY: number,
    monthWidth: number,
    rowHeight: number,
    daysInMonth: number,
    config: GanttDrawingConfig
  ): void {
    const dayWidth = monthWidth / daysInMonth;

    pdf.setDrawColor(config.dayLineColor);
    pdf.setLineWidth(config.lineWidth);

    for (let day = 1; day < daysInMonth; day++) {
      const lineX = this.isRtl
        ? startX + monthWidth - day * dayWidth
        : startX + day * dayWidth;
      pdf.line(lineX, startY, lineX, startY + rowHeight);
    }
  }

  drawRowHeader(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig,
    height: number,
    text: string,
    backgroundColor = '#f5f5f5',
    textColor = '#000000',
    drawTopBorder = false
  ): void {
    const width = config.pageWidth * 0.12;
    const headerX = this.isRtl
      ? x + this.getCalendarWidth(config) + config.lineWidth * 2
      : x;

    pdf.setFillColor(backgroundColor);
    pdf.rect(headerX, y, width, height, 'F');

    pdf.setDrawColor(config.monthBorderColor);
    pdf.setLineWidth(1);

    pdf.line(headerX, y, headerX, y + height);
    pdf.line(headerX + width, y, headerX + width, y + height);
    pdf.line(headerX, y + height, headerX + width, y + height);

    if (drawTopBorder) {
      pdf.line(headerX, y, headerX + width, y);
    }

    pdf.setTextColor(textColor);
    pdf.setFontSize(10);
    const textY = y + height / 2 + 3;

    if (this.isRtl) {
      const textWidth = pdf.getTextWidth(text);
      pdf.text(text, headerX + width - 5 - textWidth, textY);
    } else {
      pdf.text(text, headerX + 5, textY);
    }
  }

  /**
   * Helper function: Number of days in year
   */
  getDaysInYear(year: number): number {
    // Use HolidaysListHelper for consistent leap year calculation
    this.holidaysHelper.currentYear = year;
    return this.holidaysHelper.getTotalDaysInCurrentYear();
  }

  /**
   * Helper function: Number of days in month
   */
  private getDaysInMonth(year: number, month: number): number {
    // Use HolidaysListHelper for consistent month day calculation
    // Note: HolidaysListHelper uses 1-based months (1-12), JavaScript uses 0-based (0-11)
    return this.holidaysHelper.getDaysInMonth(month + 1, year);
  }

  /**
   * Creates default configuration
   */
  createDefaultConfig(): GanttDrawingConfig {
    const pageWidth = 1190.55; // A3 landscape

    return {
      pageWidth: pageWidth,
      pageHeight: 841.89, // A3 landscape
      rowHeaderWidth: pageWidth * 0.12, // 12% of page width (~143px for A3)
      rowHeight: 25, // Height of a row
      year: new Date().getFullYear(),
      startDate: new Date(new Date().getFullYear(), 0, 1),
      evenMonthColor: '#f9f9f9', // Lighter for even months
      oddMonthColor: '#ffffff', // White for odd months
      weekendColor: '#fffbcc', // Light yellow for weekends
      dayLineColor: '#e0e0e0', // Light gray for day lines
      monthBorderColor: '#888888', // Dark gray for month borders
      lineWidth: 0.5,
    };
  }

  getActualRowHeaderWidth(config: GanttDrawingConfig): number {
    return config.pageWidth * 0.12;
  }

  getCalendarWidth(config: GanttDrawingConfig): number {
    return config.pageWidth * 0.83 - config.lineWidth * 2;
  }

  private getCalendarStartX(x: number, config: GanttDrawingConfig): number {
    if (this.isRtl) {
      return x;
    }
    return x + config.pageWidth * 0.12 + config.lineWidth * 2;
  }

  drawMonthHeaders(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig,
    headerHeight = 20
  ): void {
    const availableCalendarWidth = this.getCalendarWidth(config);
    const daysInYear = this.getDaysInYear(config.year);
    const dayWidth = availableCalendarWidth / daysInYear;
    const calendarStartX = this.getCalendarStartX(x, config);

    const monthKeys = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];
    const monthNames = monthKeys.map((key) =>
      this.translateService.instant(key)
    );

    let currentX = calendarStartX;
    const monthOrder = this.isRtl ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    for (const month of monthOrder) {
      const daysInMonth = this.getDaysInMonth(config.year, month);
      const monthWidth = daysInMonth * dayWidth;

      const isEvenMonth = month % 2 === 0;
      const backgroundColor = isEvenMonth
        ? config.evenMonthColor
        : config.oddMonthColor;

      pdf.setFillColor(backgroundColor);
      pdf.rect(currentX, y, monthWidth, headerHeight, 'F');

      pdf.setDrawColor(config.monthBorderColor);
      pdf.setLineWidth(1);
      pdf.rect(currentX, y, monthWidth, headerHeight, 'S');

      pdf.setTextColor('#000000');
      pdf.setFontSize(9);

      const textWidth = pdf.getTextWidth(monthNames[month]);
      const textX = currentX + (monthWidth - textWidth) / 2;
      const textY = y + headerHeight / 2 + 3;

      pdf.text(monthNames[month], textX, textY);

      currentX += monthWidth;
    }
  }

  /**
   * Draws a horizontal line between rows (across the full width)
   */
  drawRowSeparatorLine(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig
  ): void {
    const totalWidth =
      config.pageWidth * 0.12 +
      config.lineWidth * 2 +
      this.getCalendarWidth(config);

    pdf.setDrawColor(config.monthBorderColor);
    pdf.setLineWidth(config.lineWidth);
    pdf.line(x, y, x + totalWidth, y);
  }

  /**
   * Draws a single break as a colored bar in the calendar
   */
  drawBreakBar(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig,
    breakData: any, // IBreak
    rowHeight: number
  ): void {
    if (!breakData.from || !breakData.until) {
      return;
    }

    const calendarStartX = this.getCalendarStartX(x, config);
    const availableCalendarWidth = this.getCalendarWidth(config);

    const daysInYear = this.getDaysInYear(config.year);
    const dayWidth = availableCalendarWidth / daysInYear;

    const breakStart = new Date(breakData.from);
    const breakEnd = new Date(breakData.until);

    if (
      breakStart.getFullYear() !== config.year &&
      breakEnd.getFullYear() !== config.year
    ) {
      return;
    }

    const yearStartUTC = Date.UTC(config.year, 0, 1);
    const breakStartUTC = Date.UTC(breakStart.getFullYear(), breakStart.getMonth(), breakStart.getDate());
    const breakEndUTC = Date.UTC(breakEnd.getFullYear(), breakEnd.getMonth(), breakEnd.getDate());

    const dayOfYearStart = Math.max(
      0,
      Math.floor((breakStartUTC - yearStartUTC) / (24 * 60 * 60 * 1000))
    );
    const dayOfYearEnd = Math.min(
      daysInYear - 1,
      Math.floor((breakEndUTC - yearStartUTC) / (24 * 60 * 60 * 1000))
    );

    const barWidth = (dayOfYearEnd - dayOfYearStart + 1) * dayWidth;
    const ltrBarStartX = calendarStartX + dayOfYearStart * dayWidth;
    const barStartX = this.mirrorX(calendarStartX, availableCalendarWidth, ltrBarStartX, barWidth);

    let breakColor = '#ff6b6b';

    if (breakData.absence && breakData.absence.color) {
      breakColor = breakData.absence.color;
    }
    else if (breakData.absenceId) {
      const fullAbsence = (this.dataManagementAbsence.absenceList() as Absence[])
        .find((absence: Absence) => absence.id === breakData.absenceId);

      if (fullAbsence?.color) {
        breakColor = fullAbsence.color;
      }
    }

    const barHeight = rowHeight * 0.7;
    const barY = y + (rowHeight - barHeight) / 2;

    pdf.setFillColor(breakColor);
    pdf.rect(barStartX, barY, barWidth, barHeight, 'F');

    pdf.setDrawColor('#333333');
    pdf.setLineWidth(0.5);
    pdf.rect(barStartX, barY, barWidth, barHeight, 'S');
  }

  /**
   * Draws all breaks for a row
   */
  drawRowBreaks(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig,
    breaks: any[], // IBreak[]
    rowHeight: number
  ): void {
    if (!breaks || breaks.length === 0) {
      return;
    }

    // Draw each break
    breaks.forEach((breakData) => {
      this.drawBreakBar(pdf, x, y, config, breakData, rowHeight);
    });
  }

  /**
   * Draws a legend with the selected absence types
   */
  drawLegend(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    selectedAbsenceTypes: any[] // { id: string, name: string, color: string }[]
  ): void {
    if (!selectedAbsenceTypes || selectedAbsenceTypes.length === 0) {
      return;
    }

    const colorBoxSize = 8;
    const lineHeight = 15;
    const itemSpacing = 20;
    const textGap = 3;

    let currentX = this.isRtl ? x + width - 5 : x + 5;
    let currentY = y + 15;

    selectedAbsenceTypes.forEach((absenceType, index) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const displayName = absenceType.name || `Type ${index + 1}`;
      const textWidth = pdf.getTextWidth(displayName);
      const itemWidth = colorBoxSize + textGap + textWidth + itemSpacing;

      if (this.isRtl) {
        if (currentX - itemWidth < x + 5 && index > 0) {
          currentX = x + width - 5;
          currentY += lineHeight;
        }

        const textX = currentX - textWidth;
        const boxX = textX - textGap - colorBoxSize;

        pdf.setFillColor(absenceType.color || '#ff6b6b');
        pdf.rect(boxX, currentY - colorBoxSize / 2, colorBoxSize, colorBoxSize, 'F');

        pdf.setDrawColor('#333333');
        pdf.setLineWidth(0.5);
        pdf.rect(boxX, currentY - colorBoxSize / 2, colorBoxSize, colorBoxSize, 'S');

        pdf.setTextColor('#000000');
        pdf.text(displayName, textX, currentY + 2);

        currentX -= itemWidth;
      } else {
        if (currentX + itemWidth > x + width - 5 && index > 0) {
          currentX = x + 5;
          currentY += lineHeight;
        }

        pdf.setFillColor(absenceType.color || '#ff6b6b');
        pdf.rect(currentX, currentY - colorBoxSize / 2, colorBoxSize, colorBoxSize, 'F');

        pdf.setDrawColor('#333333');
        pdf.setLineWidth(0.5);
        pdf.rect(currentX, currentY - colorBoxSize / 2, colorBoxSize, colorBoxSize, 'S');

        pdf.setTextColor('#000000');
        pdf.text(displayName, currentX + colorBoxSize + textGap, currentY + 2);

        currentX += itemWidth;
      }
    });
  }

  drawCompleteRow(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig,
    personName: string,
    includeMonthHeaders = false,
    monthHeaderHeight = 20,
    drawBottomSeparator = true,
    isFirstRowAfterHeaders = false,
    breaks: any[] = []
  ): void {
    const rowHeight = config.rowHeight;
    let currentY = y;

    if (includeMonthHeaders) {
      this.drawMonthHeaders(pdf, x, currentY, config, monthHeaderHeight);
      currentY += monthHeaderHeight;
    }

    this.drawRowHeader(
      pdf,
      x,
      currentY,
      config,
      rowHeight,
      personName,
      '#f5f5f5',
      '#000000',
      !isFirstRowAfterHeaders
    );

    this.drawRowBackground({
      x: x,
      y: currentY,
      pdf: pdf,
      config: config,
    });

    this.drawRowBreaks(pdf, x, currentY, config, breaks, rowHeight);

    if (drawBottomSeparator) {
      this.drawRowSeparatorLine(pdf, x, currentY + rowHeight, config);
    }
  }
}
