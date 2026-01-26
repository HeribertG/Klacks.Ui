/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { GanttPdfDrawingService } from './gantt-pdf-drawing.service';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';

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
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);
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

          const currentLang = this.translateService.currentLang;
          const localizedName = getLocalizedValue(fullAbsence?.name, currentLang) || abs.name;

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

  /**
   * Creates a new jsPDF instance - extracted for testing purposes
   */
  private createPdfInstance(): jsPDF {
    return new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a3',
    });
  }

  async exportTest2DDrawing(options: GanttExportOptions = {}): Promise<void> {
    const currentYear = this.dataManagementBreak.breakFilter.currentYear;
    const { title = `Gantt Chart ${currentYear}` } = options;

    const pdf = this.createPdfInstance();

    this.addPageHeader(pdf, title, 1, 1);

    const config = this.ganttPdfDrawingService.createDefaultConfig();

    // Use the current year from the BreakFilter
    config.year = this.dataManagementBreak.breakFilter.currentYear;
    config.startDate = new Date(config.year, 0, 1);

    let currentY = this.MARGINS.top + 60; // After header
    const rowHeight = 30; // Slightly higher for better visibility
    const monthHeaderHeight = 25; // Height for month headers
    config.rowHeight = rowHeight;

    // Collect selected absence types for legend
    const selectedAbsenceTypes = this.getSelectedAbsenceTypes();

    // Draw legend ABOVE the month headers (if absence types are selected)
    if (selectedAbsenceTypes.length > 0) {
      const availableWidth =
        this.A3_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;

      // Dynamic legend height based on number and length of items
      const estimatedItemWidth = selectedAbsenceTypes.reduce((total, type) => {
        return total + type.name.length * 5 + 30; // Approximately 5pt per character + box + spacing
      }, 0);

      const needsMultipleLines = estimatedItemWidth > availableWidth;
      const legendHeight = needsMultipleLines ? 45 : 25; // More height if multiple lines needed

      const legendX = this.MARGINS.left;
      const legendY = currentY;

      this.ganttPdfDrawingService.drawLegend(
        pdf,
        legendX,
        legendY,
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

    // Draw separator line under month headers
    this.ganttPdfDrawingService.drawRowSeparatorLine(
      pdf,
      this.MARGINS.left,
      currentY + monthHeaderHeight,
      config
    );

    currentY += monthHeaderHeight + 2; // Some spacing after headers

    // Use real client data
    const totalClients = this.dataManagementBreak.rows;

    // Calculate how many rows fit on one page
    const availableHeight =
      this.A3_LANDSCAPE.height - this.MARGINS.bottom - currentY;
    const maxRowsPerPage = Math.floor(availableHeight / rowHeight) - 1; // -1 for safety

    for (let clientIndex = 0; clientIndex < totalClients; clientIndex++) {
      // Get client name and break data
      const clientName = this.dataManagementBreak.readClientName(clientIndex);
      const clientBreaks = this.dataManagementBreak.readData(clientIndex) || [];

      // Check if new page is needed
      if (clientIndex > 0 && clientIndex % maxRowsPerPage === 0) {
        // New page
        pdf.addPage();
        this.addPageHeader(
          pdf,
          title,
          Math.floor(clientIndex / maxRowsPerPage) + 1,
          Math.ceil(totalClients / maxRowsPerPage)
        );

        // Reset Y position and draw headers again
        currentY = this.MARGINS.top + 60;

        // Draw legend (ABOVE the month headers)
        if (selectedAbsenceTypes.length > 0) {
          const availableWidth =
            this.A3_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;

          // Same dynamic height calculation as on first page
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
      const isFirstRowAfterHeaders = clientIndex % maxRowsPerPage === 0; // First row on each page

      // Draw complete row with real client names and break data
      this.ganttPdfDrawingService.drawCompleteRow(
        pdf,
        this.MARGINS.left,
        currentY,
        config,
        clientName || `Client ${clientIndex + 1}`, // Fallback if name is empty
        false, // No month headers per row
        20,
        !isLastRow && !isLastRowOnPage, // No separator after last row or last row on page
        isFirstRowAfterHeaders, // First row after headers has no top border
        clientBreaks // Real break data for this client
      );

      currentY += rowHeight;

      // Reset Y for new page
      if (isLastRowOnPage && !isLastRow) {
        currentY = this.MARGINS.top + 60;
      }
    }

    // Additional info (only on the last page)
    if (totalClients > 0) {
      pdf.setFontSize(10);
      pdf.text(
        `Total ${totalClients} clients exported`,
        this.MARGINS.left,
        currentY + 20
      );
      pdf.text(
        `Year: ${config.year} (${this.ganttPdfDrawingService.getDaysInYear(
          config.year
        )} days)`,
        this.MARGINS.left,
        currentY + 65
      );
    } else {
      pdf.setFontSize(12);
      pdf.text('No client data available', this.MARGINS.left, currentY + 20);
      pdf.text(
        'Please ensure that data has been loaded',
        this.MARGINS.left,
        currentY + 40
      );
    }

    const fileName = `gantt-real-data-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }
}
