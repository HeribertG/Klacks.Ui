/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementBreakService } from 'src/app/domain/services/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/data-management-absence-gantt.service';
import { CalendarSettingService } from './calendar-setting.service';
import { DrawCalendarGanttService } from './draw-calendar-gantt.service';
import { DrawRowHeaderService } from './draw-row-header.service';
import { RenderCalendarGridService } from './render-calendar-grid.service';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { RowHeaderCanvasManagerService } from './row-header-canvas.service';
import { GanttPdfDrawingService } from './gantt-pdf-drawing.service';

export interface GanttExportOptions {
  title?: string;
  includeAllRows?: boolean;
  startRow?: number;
  endRow?: number;
  pageOrientation?: 'landscape' | 'portrait';
  pageFormat?: 'a3' | 'a4';
}

@Injectable()
export class GanttPdfExportService {
  private translateService = inject(TranslateService);
  private dataManagementBreak = inject(DataManagementBreakService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  private calendarSetting = inject(CalendarSettingService);
  private drawCalendarGantt = inject(DrawCalendarGanttService);
  private drawRowHeader = inject(DrawRowHeaderService);
  private renderCalendarGrid = inject(RenderCalendarGridService);
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private rowHeaderCanvasManager = inject(RowHeaderCanvasManagerService);
  private ganttPdfDrawingService = inject(GanttPdfDrawingService);

  // A3 landscape dimensions in points (1 point = 1/72 inch)
  private readonly A3_LANDSCAPE = {
    width: 1190.55, // 420mm
    height: 841.89, // 297mm
  };

  // Margins and spacing
  private readonly MARGINS = {
    top: 40,
    left: 20,
    right: 20,
    bottom: 30,
  };

  private readonly ROW_HEADER_WIDTH = 200;
  private readonly GANTT_SECTION_WIDTH =
    this.A3_LANDSCAPE.width -
    this.MARGINS.left -
    this.MARGINS.right -
    this.ROW_HEADER_WIDTH;

  /**
   * Collects all selected absence types with localized names and colors.
   */
  private getSelectedAbsenceTypes(): {
    id: string;
    name: string;
    color: string;
  }[] {
    try {
      const selectedTypes = this.dataManagementBreak.breakFilter.absences
        .filter((abs) => abs.checked)
        .map((abs) => {
          const fullAbsence = this.dataManagementAbsence
            .absenceList()
            .find((absence) => absence.id === abs.id);

          let localizedName = abs.name;
          if (fullAbsence?.name) {
            const currentLang = this.translateService.currentLang as any;
            localizedName =
              fullAbsence.name[currentLang] ||
              fullAbsence.name['de'] ||
              fullAbsence.name['en'] ||
              abs.name;
          }

          return {
            id: abs.id,
            name: localizedName,
            color: fullAbsence?.color || '#ff6b6b',
          };
        });
      return selectedTypes;
    } catch {
      return [];
    }
  }

  // AUSKOMMENTIERT: Canvas-basierter Export mit Pagination
  // async exportGanttToPdf(
  //   rowHeaderCanvas: HTMLCanvasElement,
  //   ganttCanvas: HTMLCanvasElement,
  //   options: GanttExportOptions = {}
  // ): Promise<void> {
  //   const {
  //     title = 'Gantt Chart Export',
  //     includeAllRows = true,
  //     startRow = 0,
  //     endRow = this.dataManagementBreak.rows - 1,
  //     pageOrientation = 'landscape',
  //     pageFormat = 'a3',
  //   } = options;

  //   const pdf = new jsPDF({
  //     orientation: pageOrientation,
  //     unit: 'pt',
  //     format: pageFormat.toLowerCase(),
  //   });

  //   const availableHeight =
  //     this.A3_LANDSCAPE.height - this.MARGINS.top - this.MARGINS.bottom - 60; // 60 for title and date
  //   const rowHeight = this.calendarSetting.cellHeight;
  //   const rowsPerPage = Math.floor(availableHeight / rowHeight);

  //   const totalRows = includeAllRows
  //     ? this.dataManagementBreak.rows
  //     : endRow - startRow + 1;
  //   const totalPages = Math.ceil(totalRows / rowsPerPage);

  //   let currentRow = includeAllRows ? 0 : startRow;

  //   for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
  //     if (pageIndex > 0) {
  //       pdf.addPage();
  //     }

  //     // Add title and date
  //     this.addPageHeader(pdf, title, pageIndex + 1, totalPages);

  //     // Calculate rows for this page
  //     const rowsOnThisPage = Math.min(
  //       rowsPerPage,
  //       totalRows - pageIndex * rowsPerPage
  //     );
  //     const startRowForPage = currentRow;
  //     const endRowForPage = currentRow + rowsOnThisPage - 1;

  //     // Capture and add row headers
  //     await this.addRowHeadersToPage(
  //       pdf,
  //       rowHeaderCanvas,
  //       startRowForPage,
  //       endRowForPage
  //     );

  //     // Capture and add gantt section
  //     await this.addGanttSectionToPage(
  //       pdf,
  //       ganttCanvas,
  //       startRowForPage,
  //       endRowForPage
  //     );

  //     currentRow += rowsOnThisPage;
  //   }

  //   const fileName = `gantt-chart-${new Date().getTime()}.pdf`;
  //   pdf.save(fileName);
  // }

  private addPageHeader(
    pdf: jsPDF,
    title: string,
    pageNumber: number,
    totalPages: number
  ): void {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, this.MARGINS.left, this.MARGINS.top);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const generatedText = this.translateService.instant('pdf.generated');
    const pageText = this.translateService.instant('pdf.page');
    const ofText = this.translateService.instant('pdf.of');

    const dateString = `${generatedText}: ${new Date().toLocaleDateString()}`;
    const pageString = `${pageText} ${pageNumber} ${ofText} ${totalPages}`;

    pdf.text(dateString, this.MARGINS.left, this.MARGINS.top + 20);
    pdf.text(
      pageString,
      this.A3_LANDSCAPE.width - this.MARGINS.right - 100,
      this.MARGINS.top + 20
    );
  }

  private async addRowHeadersToPage(
    pdf: jsPDF,
    rowHeaderCanvas: HTMLCanvasElement,
    startRow: number,
    endRow: number
  ): Promise<void> {
    const rowHeight = this.calendarSetting.cellHeight;
    const totalHeight = (endRow - startRow + 1) * rowHeight;

    // Create a temporary canvas for the row headers section
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCanvas.width = this.ROW_HEADER_WIDTH * window.devicePixelRatio;
    tempCanvas.height = totalHeight * window.devicePixelRatio;
    tempCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Copy the relevant section from the row header canvas
    const sourceY = startRow * rowHeight;
    tempCtx.drawImage(
      rowHeaderCanvas,
      0,
      sourceY,
      this.ROW_HEADER_WIDTH,
      totalHeight,
      0,
      0,
      this.ROW_HEADER_WIDTH,
      totalHeight
    );

    const imageData = tempCanvas.toDataURL('image/png');
    pdf.addImage(
      imageData,
      'PNG',
      this.MARGINS.left,
      this.MARGINS.top + 40,
      this.ROW_HEADER_WIDTH,
      totalHeight
    );
  }

  private async addGanttSectionToPage(
    pdf: jsPDF,
    ganttCanvas: HTMLCanvasElement,
    startRow: number,
    endRow: number
  ): Promise<void> {
    const rowHeight = this.calendarSetting.cellHeight;
    const totalHeight = (endRow - startRow + 1) * rowHeight;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCanvas.width = this.GANTT_SECTION_WIDTH * window.devicePixelRatio;
    tempCanvas.height = totalHeight * window.devicePixelRatio;
    tempCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const sourceY = startRow * rowHeight;
    tempCtx.drawImage(
      ganttCanvas,
      0,
      sourceY,
      this.GANTT_SECTION_WIDTH,
      totalHeight,
      0,
      0,
      this.GANTT_SECTION_WIDTH,
      totalHeight
    );

    const imageData = tempCanvas.toDataURL('image/png');
    pdf.addImage(
      imageData,
      'PNG',
      this.MARGINS.left + this.ROW_HEADER_WIDTH,
      this.MARGINS.top + 40,
      this.GANTT_SECTION_WIDTH,
      totalHeight
    );
  }

  // AUSKOMMENTIERT: Export mit temporären Canvas für vollständige Ansicht
  // Method to export complete gantt with all visible columns
  // async exportFullGanttToPdf(
  //   rowHeaderCanvas: HTMLCanvasElement,
  //   ganttCanvas: HTMLCanvasElement,
  //   options: GanttExportOptions = {}
  // ): Promise<void> {
  //   const fullRowHeaderCanvas = await this.createFullRowHeaderCanvas();
  //   const fullGanttCanvas = await this.createFullGanttCanvas();

  //   await this.exportGanttToPdf(fullRowHeaderCanvas, fullGanttCanvas, {
  //     ...options,
  //     includeAllRows: true,
  //   });
  // }

  private async createFullRowHeaderCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const totalRows = this.dataManagementBreak.rows;
    const rowHeight = this.calendarSetting.cellHeight;

    canvas.width = this.ROW_HEADER_WIDTH * window.devicePixelRatio;
    canvas.height = totalRows * rowHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.ROW_HEADER_WIDTH, totalRows * rowHeight);

    const originalCanvas = this.rowHeaderCanvasManager.canvas;
    const originalContext = this.rowHeaderCanvasManager.ctx;

    this.rowHeaderCanvasManager.canvas = canvas;
    this.rowHeaderCanvasManager.ctx = ctx;

    try {
      this.drawRowHeader.renderRowHeader();
    } finally {
      this.rowHeaderCanvasManager.canvas = originalCanvas;
      this.rowHeaderCanvasManager.ctx = originalContext;
    }

    return canvas;
  }

  private async createFullGanttCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const totalRows = this.dataManagementBreak.rows;
    const rowHeight = this.calendarSetting.cellHeight;
    const totalCols = this.drawCalendarGantt.columns;
    const colWidth = this.calendarSetting.cellWidth;

    canvas.width = totalCols * colWidth * window.devicePixelRatio;
    canvas.height = totalRows * rowHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set canvas size and clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalCols * colWidth, totalRows * rowHeight);

    // Temporarily store current canvas manager canvas reference
    const originalCanvas = this.ganttCanvasManager.canvas;
    const originalContext = this.ganttCanvasManager.ctx;

    // Set our temporary canvas as the active canvas
    this.ganttCanvasManager.canvas = canvas;
    this.ganttCanvasManager.ctx = ctx;

    try {
      this.renderCalendarGrid.renderRuler();
      this.renderCalendarGrid.renderCalendar();
    } finally {
      this.ganttCanvasManager.canvas = originalCanvas;
      this.ganttCanvasManager.ctx = originalContext;
    }

    return canvas;
  }

  // AUSKOMMENTIERT: Export der aktuellen Canvas-Ansicht (ohne Pagination)
  // async exportCurrentViewToPdf(
  //   rowHeaderCanvas: HTMLCanvasElement,
  //   ganttCanvas: HTMLCanvasElement,
  //   options: GanttExportOptions = {}
  // ): Promise<void> {
  //   const { title = 'Gantt Chart Export' } = options;

  //   const pdf = new jsPDF({
  //     orientation: 'landscape',
  //     unit: 'pt',
  //     format: 'a3',
  //   });

  //   // Add title and date
  //   this.addPageHeader(pdf, title, 1, 1);

  //   // Calculate sizes to fit both canvases on the page
  //   const availableWidth =
  //     this.A3_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;
  //   const availableHeight =
  //     this.A3_LANDSCAPE.height - this.MARGINS.top - this.MARGINS.bottom - 60;

  //   // Check if canvases have content
  //   if (rowHeaderCanvas.width === 0 || rowHeaderCanvas.height === 0) {
  //     console.warn('Row header canvas has zero dimensions');
  //   }
  //   if (ganttCanvas.width === 0 || ganttCanvas.height === 0) {
  //     console.warn('Gantt canvas has zero dimensions');
  //   }

  //   // Row header section
  //   try {
  //     const rowHeaderImageData = rowHeaderCanvas.toDataURL('image/png');
  //     console.log('Row header image data length:', rowHeaderImageData.length);

  //     const rowHeaderAspect = rowHeaderCanvas.height / rowHeaderCanvas.width;
  //     const rowHeaderWidth = Math.min(
  //       this.ROW_HEADER_WIDTH,
  //       availableWidth * 0.3
  //     );
  //     const rowHeaderHeight = Math.min(
  //       rowHeaderWidth * rowHeaderAspect,
  //       availableHeight
  //     );

  //     console.log('Adding row header image:', {
  //       width: rowHeaderWidth,
  //       height: rowHeaderHeight,
  //       x: this.MARGINS.left,
  //       y: this.MARGINS.top + 40,
  //     });

  //     pdf.addImage(
  //       rowHeaderImageData,
  //       'PNG',
  //       this.MARGINS.left,
  //       this.MARGINS.top + 40,
  //       rowHeaderWidth,
  //       rowHeaderHeight
  //     );
  //   } catch (error) {
  //     console.error('Error adding row header image:', error);
  //   }

  //   try {
  //     const ganttImageData = ganttCanvas.toDataURL('image/png');
  //     console.log('Gantt image data length:', ganttImageData.length);

  //     const ganttAspect = ganttCanvas.height / ganttCanvas.width;
  //     const ganttWidth = availableWidth - this.ROW_HEADER_WIDTH - 10;
  //     const ganttHeight = Math.min(ganttWidth * ganttAspect, availableHeight);

  //     console.log('Adding gantt image:', {
  //       width: ganttWidth,
  //       height: ganttHeight,
  //       x: this.MARGINS.left + this.ROW_HEADER_WIDTH + 10,
  //       y: this.MARGINS.top + 40,
  //     });

  //     pdf.addImage(
  //       ganttImageData,
  //       'PNG',
  //       this.MARGINS.left + this.ROW_HEADER_WIDTH + 10,
  //       this.MARGINS.top + 40,
  //       ganttWidth,
  //       ganttHeight
  //     );
  //   } catch (error) {
  //     console.error('Error adding gantt image:', error);
  //   }

  //   const fileName = `gantt-chart-${new Date().getTime()}.pdf`;
  //   pdf.save(fileName);
  // }

  async exportTest2DDrawing(options: GanttExportOptions = {}): Promise<void> {
    const { title = 'Gantt Chart - Real Client Data' } = options;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a3',
    });

    this.addPageHeader(pdf, title, 1, 1);

    const config = this.ganttPdfDrawingService.createDefaultConfig();

    let currentY = this.MARGINS.top + 60; // Nach Header
    const rowHeight = 30; // Etwas höher für bessere Sichtbarkeit
    const monthHeaderHeight = 25; // Höhe für Monats-Header
    config.rowHeight = rowHeight;

    // Sammle selektierte Absence Types für Legende
    const selectedAbsenceTypes = this.getSelectedAbsenceTypes();

    // Zeichne Legende OBERHALB der Monats-Header (falls Absence Types selektiert sind)
    if (selectedAbsenceTypes.length > 0) {
      const availableWidth =
        this.A3_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;

      // Dynamische Legendenhöhe basierend auf Anzahl und Länge der Items
      const estimatedItemWidth = selectedAbsenceTypes.reduce((total, type) => {
        return total + type.name.length * 5 + 30; // Ungefähr 5pt pro Zeichen + Box + Spacing
      }, 0);

      const needsMultipleLines = estimatedItemWidth > availableWidth;
      const legendHeight = needsMultipleLines ? 45 : 25; // Mehr Höhe falls mehrere Zeilen nötig

      const legendX = this.MARGINS.left;
      const legendY = currentY;

      this.ganttPdfDrawingService.drawLegend(
        pdf,
        legendX,
        legendY,
        availableWidth, // Gesamte verfügbare Seitenbreite
        legendHeight,
        selectedAbsenceTypes
      );

      currentY += legendHeight + 3;
    }

    this.ganttPdfDrawingService.drawMonthHeaders(
      pdf,
      this.MARGINS.left,
      currentY,
      config,
      monthHeaderHeight
    );

    // Zeichne Trennlinie unter den Month Headers
    this.ganttPdfDrawingService.drawRowSeparatorLine(
      pdf,
      this.MARGINS.left,
      currentY + monthHeaderHeight,
      config
    );

    currentY += monthHeaderHeight + 2; // Etwas Abstand nach Headers

    // Verwende reale Client-Daten
    const totalClients = this.dataManagementBreak.rows;

    // Berechne wieviele Rows auf eine Seite passen
    const availableHeight =
      this.A3_LANDSCAPE.height - this.MARGINS.bottom - currentY;
    const maxRowsPerPage = Math.floor(availableHeight / rowHeight) - 1; // -1 für Sicherheit

    for (let clientIndex = 0; clientIndex < totalClients; clientIndex++) {
      // Hole Client-Name und Break-Daten
      const clientName = this.dataManagementBreak.readClientName(clientIndex);
      const clientBreaks = this.dataManagementBreak.readData(clientIndex) || [];

      // Prüfe ob neue Seite benötigt wird
      if (clientIndex > 0 && clientIndex % maxRowsPerPage === 0) {
        // Neue Seite
        pdf.addPage();
        this.addPageHeader(
          pdf,
          title,
          Math.floor(clientIndex / maxRowsPerPage) + 1,
          Math.ceil(totalClients / maxRowsPerPage)
        );

        // Reset Y-Position und zeichne Headers wieder
        currentY = this.MARGINS.top + 60;

        // Zeichne Legende auch auf neuen Seiten (OBERHALB der Month Headers)
        if (selectedAbsenceTypes.length > 0) {
          const availableWidth =
            this.A3_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;

          // Gleiche dynamische Höhenberechnung wie auf der ersten Seite
          const estimatedItemWidth = selectedAbsenceTypes.reduce(
            (total, type) => {
              return total + type.name.length * 5 + 30;
            },
            0
          );
          const needsMultipleLines = estimatedItemWidth > availableWidth;
          const legendHeight = needsMultipleLines ? 45 : 25;

          this.ganttPdfDrawingService.drawLegend(
            pdf,
            this.MARGINS.left,
            currentY,
            availableWidth,
            legendHeight,
            selectedAbsenceTypes
          );

          currentY += legendHeight + 3;
        }

        this.ganttPdfDrawingService.drawMonthHeaders(
          pdf,
          this.MARGINS.left,
          currentY,
          config,
          monthHeaderHeight
        );

        this.ganttPdfDrawingService.drawRowSeparatorLine(
          pdf,
          this.MARGINS.left,
          currentY + monthHeaderHeight,
          config
        );

        currentY += monthHeaderHeight + 2;
      }

      const isLastRow = clientIndex === totalClients - 1;
      const isLastRowOnPage = (clientIndex + 1) % maxRowsPerPage === 0;
      const isFirstRowAfterHeaders = clientIndex % maxRowsPerPage === 0; // Erste Row auf jeder Seite

      // Zeichne komplette Row mit realen Client-Namen und Break-Daten
      this.ganttPdfDrawingService.drawCompleteRow(
        pdf,
        this.MARGINS.left,
        currentY,
        config,
        clientName || `Client ${clientIndex + 1}`, // Fallback falls Name leer
        false, // Keine Monats-Header pro Row
        20, // monthHeaderHeight (unused here)
        !isLastRow && !isLastRowOnPage, // Keine Trennlinie nach der letzten Row oder letzter Row auf Seite
        isFirstRowAfterHeaders, // Erste Row nach Headers hat keinen oberen Rahmen
        clientBreaks // Echte Break-Daten für diesen Client
      );

      currentY += rowHeight;

      // Reset Y für neue Seite
      if (isLastRowOnPage && !isLastRow) {
        currentY = this.MARGINS.top + 60;
      }
    }

    // Zusätzliche Info (nur auf der letzten Seite)
    if (totalClients > 0) {
      pdf.setFontSize(10);
      pdf.text(
        `Insgesamt ${totalClients} Clients exportiert`,
        this.MARGINS.left,
        currentY + 20
      );
      pdf.text(
        `Jahr: ${config.year} (${this.ganttPdfDrawingService.getDaysInYear(
          config.year
        )} Tage)`,
        this.MARGINS.left,
        currentY + 65
      );
    } else {
      pdf.setFontSize(12);
      pdf.text(
        'Keine Client-Daten verfügbar',
        this.MARGINS.left,
        currentY + 20
      );
      pdf.text(
        'Bitte stellen Sie sicher, dass Daten geladen sind',
        this.MARGINS.left,
        currentY + 40
      );
    }

    const fileName = `gantt-real-data-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }

  // Alternative method using html2canvas if available
  async exportViewWithHtml2Canvas(
    options: GanttExportOptions = {}
  ): Promise<void> {
    const { title = 'Gantt Chart Export' } = options;

    // Try to capture the entire gantt area
    const ganttContainer = document.querySelector(
      '.container-box'
    ) as HTMLElement;
    const rowHeaderContainer = document.querySelector(
      '#box-calendar-row-header'
    ) as HTMLElement;

    if (!ganttContainer || !rowHeaderContainer) {
      console.error('Could not find gantt containers');
      return;
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a3',
    });

    // Add title and date
    this.addPageHeader(pdf, title, 1, 1);

    // For now, just add a placeholder
    pdf.setFontSize(12);
    pdf.text(
      'Gantt chart content would be captured here',
      this.MARGINS.left,
      this.MARGINS.top + 80
    );
    pdf.text(
      'Canvas dimensions and data logged to console',
      this.MARGINS.left,
      this.MARGINS.top + 100
    );

    const fileName = `gantt-chart-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }
}
