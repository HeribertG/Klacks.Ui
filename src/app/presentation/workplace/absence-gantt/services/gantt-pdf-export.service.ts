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

  // Layout constants
  private readonly HEADER_OFFSET = 60;
  private readonly ROW_HEIGHT = 30;
  private readonly MONTH_HEADER_HEIGHT = 25;
  private readonly LEGEND_HEIGHT_SINGLE = 25;
  private readonly LEGEND_HEIGHT_MULTI = 45;
  private readonly LEGEND_CHAR_WIDTH_ESTIMATE = 5;
  private readonly LEGEND_ITEM_EXTRA_WIDTH = 30;
  private readonly SPACING_AFTER_LEGEND = 3;
  private readonly SPACING_AFTER_HEADERS = 2;
  private readonly PAGE_NUMBER_RIGHT_OFFSET = 100;
  private readonly SUBTITLE_OFFSET = 20;
  private readonly SAFETY_ROW_BUFFER = 1;
  private readonly CLIENT_NAME_WIDTH = 20;
  private readonly FOOTER_SPACING = 20;
  private readonly FOOTER_YEAR_OFFSET = 65;

  // Font
  private readonly FONT_FAMILY = 'helvetica';
  private readonly FONT_WEIGHT_BOLD = 'bold';
  private readonly FONT_WEIGHT_NORMAL = 'normal';
  private readonly FONT_SIZE_TITLE = 16;
  private readonly FONT_SIZE_NORMAL = 10;
  private readonly FONT_SIZE_NO_DATA = 12;

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
          const localizedName =
            getLocalizedValue(fullAbsence?.name, currentLang) || abs.name;

          return {
            id: abs.id,
            name: localizedName,
            color: fullAbsence?.color || '#ff6b6b',
          };
        });
      return selectedTypes;
    } catch (error) {
      console.error('Failed to collect selected absence types:', error);
      return [];
    }
  }

  private addPageHeader(
    pdf: jsPDF,
    title: string,
    pageNumber: number,
    totalPages: number,
  ): void {
    pdf.setFontSize(this.FONT_SIZE_TITLE);
    pdf.setFont(this.FONT_FAMILY, this.FONT_WEIGHT_BOLD);
    pdf.text(title, this.MARGINS.left, this.MARGINS.top);

    pdf.setFontSize(this.FONT_SIZE_NORMAL);
    pdf.setFont(this.FONT_FAMILY, this.FONT_WEIGHT_NORMAL);
    const generatedText = this.translateService.instant('pdf.generated');
    const pageText = this.translateService.instant('pdf.page');
    const ofText = this.translateService.instant('pdf.of');

    const dateString = `${generatedText}: ${new Date().toLocaleDateString()}`;
    const pageString = `${pageText} ${pageNumber} ${ofText} ${totalPages}`;

    pdf.text(dateString, this.MARGINS.left, this.MARGINS.top + this.SUBTITLE_OFFSET);
    pdf.text(
      pageString,
      this.A3_LANDSCAPE.width - this.MARGINS.right - this.PAGE_NUMBER_RIGHT_OFFSET,
      this.MARGINS.top + this.SUBTITLE_OFFSET,
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

    const config = this.ganttPdfDrawingService.createDefaultConfig();

    // Use the current year from the BreakFilter
    config.year = this.dataManagementBreak.breakFilter.currentYear;
    config.startDate = new Date(config.year, 0, 1);

    config.rowHeight = this.ROW_HEIGHT;

    // Collect selected absence types for legend
    const selectedAbsenceTypes = this.getSelectedAbsenceTypes();

    // Pre-compute legend height to calculate totalPages before drawing
    const availableWidth =
      this.A3_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;
    let legendHeight = 0;
    if (selectedAbsenceTypes.length > 0) {
      const estimatedItemWidth = selectedAbsenceTypes.reduce((total, type) => {
        return total + type.name.length * this.LEGEND_CHAR_WIDTH_ESTIMATE + this.LEGEND_ITEM_EXTRA_WIDTH;
      }, 0);
      const needsMultipleLines = estimatedItemWidth > availableWidth;
      legendHeight = needsMultipleLines ? this.LEGEND_HEIGHT_MULTI : this.LEGEND_HEIGHT_SINGLE;
    }

    let currentY = this.MARGINS.top + this.HEADER_OFFSET;
    if (legendHeight > 0) {
      currentY += legendHeight + this.SPACING_AFTER_LEGEND;
    }
    currentY += this.MONTH_HEADER_HEIGHT + this.SPACING_AFTER_HEADERS;

    const totalClients = this.dataManagementBreak.rows;
    const availableHeight =
      this.A3_LANDSCAPE.height - this.MARGINS.bottom - currentY;
    const maxRowsPerPage = Math.floor(availableHeight / this.ROW_HEIGHT) - this.SAFETY_ROW_BUFFER;
    const totalPages = Math.max(1, Math.ceil(totalClients / maxRowsPerPage));

    // Now draw first page header with correct totalPages
    this.addPageHeader(pdf, title, 1, totalPages);

    // Reset currentY for actual drawing
    currentY = this.MARGINS.top + this.HEADER_OFFSET;

    // Draw legend ABOVE the month headers (if absence types are selected)
    if (selectedAbsenceTypes.length > 0) {
      this.ganttPdfDrawingService.drawLegend(
        pdf,
        this.MARGINS.left,
        currentY,
        availableWidth,
        legendHeight,
        selectedAbsenceTypes,
      );

      currentY += legendHeight + this.SPACING_AFTER_LEGEND;
    }

    this.ganttPdfDrawingService.drawMonthHeaders(
      pdf,
      this.MARGINS.left,
      currentY,
      config,
      this.MONTH_HEADER_HEIGHT,
    );

    // Draw separator line under month headers
    this.ganttPdfDrawingService.drawRowSeparatorLine(
      pdf,
      this.MARGINS.left,
      currentY + this.MONTH_HEADER_HEIGHT,
      config,
    );

    currentY += this.MONTH_HEADER_HEIGHT + this.SPACING_AFTER_HEADERS;

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
          totalPages,
        );

        // Reset Y position and draw headers again
        currentY = this.MARGINS.top + this.HEADER_OFFSET;

        // Draw legend (ABOVE the month headers)
        if (selectedAbsenceTypes.length > 0) {
          const availableWidth =
            this.A3_LANDSCAPE.width - this.MARGINS.left - this.MARGINS.right;

          // Same dynamic height calculation as on first page
          const estimatedItemWidth = selectedAbsenceTypes.reduce(
            (total, type) => {
              return total + type.name.length * this.LEGEND_CHAR_WIDTH_ESTIMATE + this.LEGEND_ITEM_EXTRA_WIDTH;
            },
            0,
          );
          const needsMultipleLines = estimatedItemWidth > availableWidth;
          const legendHeight = needsMultipleLines ? this.LEGEND_HEIGHT_MULTI : this.LEGEND_HEIGHT_SINGLE;

          this.ganttPdfDrawingService.drawLegend(
            pdf,
            this.MARGINS.left,
            currentY,
            availableWidth,
            legendHeight,
            selectedAbsenceTypes,
          );

          currentY += legendHeight + this.SPACING_AFTER_LEGEND;
        }

        this.ganttPdfDrawingService.drawMonthHeaders(
          pdf,
          this.MARGINS.left,
          currentY,
          config,
          this.MONTH_HEADER_HEIGHT,
        );

        this.ganttPdfDrawingService.drawRowSeparatorLine(
          pdf,
          this.MARGINS.left,
          currentY + this.MONTH_HEADER_HEIGHT,
          config,
        );

        currentY += this.MONTH_HEADER_HEIGHT + this.SPACING_AFTER_HEADERS;
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
        clientName || `Client ${clientIndex + 1}`,
        false,
        this.CLIENT_NAME_WIDTH,
        !isLastRow && !isLastRowOnPage, // No separator after last row or last row on page
        isFirstRowAfterHeaders, // First row after headers has no top border
        clientBreaks, // Real break data for this client
      );

      currentY += this.ROW_HEIGHT;

      // Reset Y for new page
      if (isLastRowOnPage && !isLastRow) {
        currentY = this.MARGINS.top + this.HEADER_OFFSET;
      }
    }

    // Additional info (only on the last page)
    if (totalClients > 0) {
      pdf.setFontSize(this.FONT_SIZE_NORMAL);
      pdf.text(
        `Total ${totalClients} clients exported`,
        this.MARGINS.left,
        currentY + this.FOOTER_SPACING,
      );
      pdf.text(
        `Year: ${config.year} (${this.ganttPdfDrawingService.getDaysInYear(
          config.year,
        )} days)`,
        this.MARGINS.left,
        currentY + this.FOOTER_YEAR_OFFSET,
      );
    } else {
      pdf.setFontSize(this.FONT_SIZE_NO_DATA);
      pdf.text('No client data available', this.MARGINS.left, currentY + this.FOOTER_SPACING);
      pdf.text(
        'Please ensure that data has been loaded',
        this.MARGINS.left,
        currentY + this.FOOTER_SPACING * 2,
      );
    }

    const fileName = `gantt-real-data-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }
}
