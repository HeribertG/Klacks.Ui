import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';

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

  /**
   * Zeichnet den Background einer Row mit Monats-Hintergrunden und Tages-Linien
   * @param params - Drawing-Parameter mit Position und Konfiguration
   */
  drawRowBackground(params: RowDrawingParams): void {
    const { x, y, pdf, config } = params;

    const actualRowHeaderWidth = config.pageWidth * 0.12;

    const sideMargin = config.pageWidth * 0.05;

    const availableCalendarWidth =
      config.pageWidth * 0.83 - config.lineWidth * 2;

    const daysInYear = this.getDaysInYear(config.year);
    const dayWidth = availableCalendarWidth / daysInYear;

    const calendarStartX = x + actualRowHeaderWidth + config.lineWidth * 2;

    let currentX = calendarStartX;

    for (let month = 0; month < 12; month++) {
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

    for (let month = 0; month < 12; month++) {
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
        const xPos = startX + dayOfYear * dayWidth;
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
      const lineX = startX + day * dayWidth;
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

    // Header-Hintergrund
    pdf.setFillColor(backgroundColor);
    pdf.rect(x, y, width, height, 'F');

    // Header-Border - einzelne Linien zeichnen um Doppellinien zu vermeiden
    pdf.setDrawColor(config.monthBorderColor);
    pdf.setLineWidth(1);

    // Linke Linie
    pdf.line(x, y, x, y + height);

    // Rechte Linie
    pdf.line(x + width, y, x + width, y + height);

    // Untere Linie
    pdf.line(x, y + height, x + width, y + height);

    // Obere Linie nur wenn explizit gewünscht
    if (drawTopBorder) {
      pdf.line(x, y, x + width, y);
    }

    // Text
    pdf.setTextColor(textColor);
    pdf.setFontSize(10);
    const textY = y + height / 2 + 3; // Vertikal zentrieren
    pdf.text(text, x + 5, textY);
  }

  /**
   * Hilfsfunktion: Anzahl Tage im Jahr
   */
  getDaysInYear(year: number): number {
    return this.isLeapYear(year) ? 366 : 365;
  }

  /**
   * Hilfsfunktion: Anzahl Tage im Monat
   */
  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Hilfsfunktion: Schaltjahr prüfen
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Erstellt Standard-Konfiguration
   */
  createDefaultConfig(): GanttDrawingConfig {
    const pageWidth = 1190.55; // A3 landscape

    return {
      pageWidth: pageWidth,
      pageHeight: 841.89, // A3 landscape
      rowHeaderWidth: pageWidth * 0.12, // 12% der Seitenbreite (~143px für A3)
      rowHeight: 25, // Höhe einer Row
      year: new Date().getFullYear(),
      startDate: new Date(new Date().getFullYear(), 0, 1),
      evenMonthColor: '#f9f9f9', // Heller für gerade Monate
      oddMonthColor: '#ffffff', // Weiß für ungerade Monate
      weekendColor: '#fffbcc', // Hellgelb für Wochenenden
      dayLineColor: '#e0e0e0', // Hellgrau für Tageslinien
      monthBorderColor: '#888888', // Dunkelgrau für Monatsgrenzen
      lineWidth: 0.5,
    };
  }

  getActualRowHeaderWidth(config: GanttDrawingConfig): number {
    return config.pageWidth * 0.12;
  }

  getCalendarWidth(config: GanttDrawingConfig): number {
    return config.pageWidth * 0.83 - config.lineWidth * 2;
  }

  drawMonthHeaders(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig,
    headerHeight = 20
  ): void {
    const actualRowHeaderWidth = config.pageWidth * 0.12;

    // Available width for calendar = 83% minus 2 line thicknesses spacing
    const availableCalendarWidth =
      config.pageWidth * 0.83 - config.lineWidth * 2;

    const daysInYear = this.getDaysInYear(config.year);
    const dayWidth = availableCalendarWidth / daysInYear;

    const calendarStartX = x + actualRowHeaderWidth + config.lineWidth * 2;

    // Monatsnamen (dynamisch lokalisiert via i18n)
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

    // Durchlaufe alle Monate (nur Monats-Hintergrund, keine Wochenenden)
    let currentX = calendarStartX;

    for (let month = 0; month < 12; month++) {
      const daysInMonth = this.getDaysInMonth(config.year, month);
      const monthWidth = daysInMonth * dayWidth;

      const isEvenMonth = month % 2 === 0;
      const backgroundColor = isEvenMonth
        ? config.evenMonthColor
        : config.oddMonthColor;

      // Zeichne Header-Hintergrund
      pdf.setFillColor(backgroundColor);
      pdf.rect(currentX, y, monthWidth, headerHeight, 'F');

      // Zeichne Header-Border
      pdf.setDrawColor(config.monthBorderColor);
      pdf.setLineWidth(1);
      pdf.rect(currentX, y, monthWidth, headerHeight, 'S');

      // Zeichne Monatsname
      pdf.setTextColor('#000000');
      pdf.setFontSize(9);

      // Zentriere Text in der Monatsspalte
      const textWidth = pdf.getTextWidth(monthNames[month]);
      const textX = currentX + (monthWidth - textWidth) / 2;
      const textY = y + headerHeight / 2 + 3; // Vertikal zentrieren

      pdf.text(monthNames[month], textX, textY);

      currentX += monthWidth;
    }
  }

  /**
   * Zeichnet eine horizontale Linie zwischen Rows (über die gesamte Breite)
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
   * Zeichnet einen einzelnen Break als farbigen Balken im Kalender
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
      return; // Keine gültigen Daten
    }

    // Kalender-Startposition (nach Row-Header + Abstand)
    const actualRowHeaderWidth = config.pageWidth * 0.12;
    const calendarStartX = x + actualRowHeaderWidth + config.lineWidth * 2;
    const availableCalendarWidth = this.getCalendarWidth(config);

    // Berechne Tage im Jahr und Tag-Breite
    const daysInYear = this.getDaysInYear(config.year);
    const dayWidth = availableCalendarWidth / daysInYear;

    // Start- und End-Daten des Breaks
    const breakStart = new Date(breakData.from);
    const breakEnd = new Date(breakData.until);

    // Prüfe ob Break im aktuellen Jahr liegt
    if (
      breakStart.getFullYear() !== config.year &&
      breakEnd.getFullYear() !== config.year
    ) {
      return; // Break ist nicht in diesem Jahr
    }

    // Berechne Tag-des-Jahres für Start und Ende
    const yearStart = new Date(config.year, 0, 1);
    const dayOfYearStart = Math.max(
      0,
      Math.floor(
        (breakStart.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000)
      )
    );
    const dayOfYearEnd = Math.min(
      daysInYear - 1,
      Math.floor(
        (breakEnd.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000)
      )
    );

    // Berechne Position und Breite des Break-Balkens
    const barStartX = calendarStartX + dayOfYearStart * dayWidth;
    const barWidth = (dayOfYearEnd - dayOfYearStart + 1) * dayWidth;

    // Bestimme Farbe des Breaks
    let breakColor = '#ff6b6b'; // Default rot falls keine Absence-Farbe vorhanden
    if (breakData.absence && breakData.absence.color) {
      breakColor = breakData.absence.color;
    }

    // Zeichne Break-Balken (etwas kleiner als die volle Row-Höhe für Ästhetik)
    const barHeight = rowHeight * 0.7; // 70% der Row-Höhe
    const barY = y + (rowHeight - barHeight) / 2; // Vertikal zentrieren

    pdf.setFillColor(breakColor);
    pdf.rect(barStartX, barY, barWidth, barHeight, 'F');

    // Optional: Rahmen um den Break-Balken
    pdf.setDrawColor('#333333');
    pdf.setLineWidth(0.5);
    pdf.rect(barStartX, barY, barWidth, barHeight, 'S');
  }

  /**
   * Zeichnet alle Breaks für eine Row
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

    // Zeichne jeden Break
    breaks.forEach((breakData) => {
      this.drawBreakBar(pdf, x, y, config, breakData, rowHeight);
    });
  }

  /**
   * Zeichnet eine Legende mit den selektierten Absence-Types
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

    // Kein Rahmen mehr um die Legende

    // Startposition für Legende-Items - intelligentes Layout
    let currentX = x + 5;
    let currentY = y + 15; // Etwas Abstand vom oberen Rand
    const colorBoxSize = 8;
    const lineHeight = 15; // Höhe einer Zeile
    const itemSpacing = 20; // Abstand zwischen Items

    selectedAbsenceTypes.forEach((absenceType, index) => {
      // Berechne benötigte Breite für dieses Item
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const displayName = absenceType.name || `Type ${index + 1}`;
      const textWidth = pdf.getTextWidth(displayName);
      const itemWidth = colorBoxSize + textWidth + itemSpacing;

      // Prüfe ob Zeilenumbruch nötig (falls Item nicht in aktuelle Zeile passt)
      if (currentX + itemWidth > x + width - 5 && index > 0) {
        currentX = x + 5; // Neue Zeile beginnen
        currentY += lineHeight;
      }

      pdf.setFillColor(absenceType.color || '#ff6b6b');
      pdf.rect(
        currentX,
        currentY - colorBoxSize / 2,
        colorBoxSize,
        colorBoxSize,
        'F'
      );

      pdf.setDrawColor('#333333');
      pdf.setLineWidth(0.5);
      pdf.rect(
        currentX,
        currentY - colorBoxSize / 2,
        colorBoxSize,
        colorBoxSize,
        'S'
      );

      pdf.setTextColor('#000000');
      pdf.text(displayName, currentX + colorBoxSize + 3, currentY + 2);

      currentX += itemWidth;
    });
  }

  drawCompleteRow(
    pdf: jsPDF,
    x: number,
    y: number,
    config: GanttDrawingConfig,
    personName: string,
    includeMonthHeaders: boolean = false,
    monthHeaderHeight: number = 20,
    drawBottomSeparator: boolean = true,
    isFirstRowAfterHeaders: boolean = false,
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
