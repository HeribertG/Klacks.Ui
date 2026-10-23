// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for PDF generation from report templates using jsPDF/autoTable: prepares the document (images, fonts,
 * script shaping), renders one page per client through the header, table and footer renderers and numbers the pages.
 * @param context - ReportGenerationContext with template, provider, data, and time period
 * @param pdfUnicodeText - Applies bidi order (Hebrew/Arabic) and Thai mark positions to every drawn text
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import { environment } from 'src/environments/environment';

import { ReportTemplate, PAGE_SIZE_FORMATS } from '../../models/report/report-template.model';
import { ReportPageSize } from '../../models/report/report-page-size.enum';
import { ReportSection } from '../../models/report/report-section.model';
import { ReportSectionType } from '../../models/report/report-section-type.enum';
import { ReportFieldType } from '../../models/report/report-field-type.enum';
import { IScheduleCell } from '../../models/schedule/schedule-cell.interface';
import { resolveReportFieldLabel } from '../../helpers/report-field-label.helper';
import { selectRowsForSection } from '../../helpers/report-section-rows.helper';
import { calendarDateKey, parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { addDays } from 'src/app/domain/helpers/date.helper';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportHeaderContext } from './report-header-context.interface';
import { ReportData } from './report-data.interface';
import { ReportRow } from './report-row.type';
import { PdfRenderContext } from './pdf-render-context.interface';
import { ReportParameterContext } from './report-parameter-context.interface';
import { ReportGenerationContext } from './report-generation-context.interface';
import { ReportFontService } from './report-font.service';
import { PdfUnicodeTextService } from './pdf-unicode-text.service';
import { ReportRowFilterService } from './report-row-filter.service';
import { ReportPdfHeaderRendererService } from './report-pdf-header-renderer.service';
import { ReportPdfTableRendererService } from './report-pdf-table-renderer.service';
import { ReportPdfFooterRendererService } from './report-pdf-footer-renderer.service';

const LANDSCAPE_ORIENTATION = 1;
const DEFAULT_PAGE_FORMAT = 'a4';
const SECTION_GAP_MM = 5;
const SCHEDULE_SOURCE_ID = 'schedule';
const PLAIN_TEXT_CONTENT_TYPE = 'text/plain';

@Injectable()
export class ReportPdfService {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);
  private fontService = inject(ReportFontService);
  private pdfUnicodeText = inject(PdfUnicodeTextService);
  private rowFilterService = inject(ReportRowFilterService);
  private headerRenderer = inject(ReportPdfHeaderRendererService);
  private tableRenderer = inject(ReportPdfTableRendererService);
  private footerRenderer = inject(ReportPdfFooterRendererService);

  async generatePdf(context: ReportGenerationContext): Promise<Blob> {
    const { template, provider, data } = context;
    const isLandscape = template.pageSetup.orientation === LANDSCAPE_ORIENTATION;
    const pageFormat = PAGE_SIZE_FORMATS[template.pageSetup.size ?? ReportPageSize.A4] ?? DEFAULT_PAGE_FORMAT;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: pageFormat
    });

    const imageCache = await this.preloadImages(template, context.imageCache);
    await this.fontService.registerFontsForTexts(
      doc,
      this.collectRenderTexts(template, data, context),
      this.collectTemplateFontFamilies(template)
    );
    this.pdfUnicodeText.enableScriptShaping(doc);

    const parameterContext: ReportParameterContext = {
      parameters: template.parameters,
      values: context.parameterValues,
    };

    const clients = data.clients?.length ? data.clients : [null];
    const allRows = data.rows;

    for (let index = 0; index < clients.length; index++) {
      if (index > 0) {
        doc.addPage();
      }

      const client = clients[index];
      const clientRows = client
        ? allRows.filter(r => this.readRowClientId(r) === client.id)
        : allRows;

      const headerContext: ReportHeaderContext = {
        client: client ?? undefined,
        groupName: context.groupName,
        startDate: data.metadata?.['startDate'] ?? context.startDate,
        endDate: data.metadata?.['endDate'] ?? context.endDate,
        metadata: data.metadata,
      };

      this.renderPage(doc, template, provider, clientRows, headerContext, imageCache, parameterContext);
    }

    this.footerRenderer.renderPageNumbers(doc, template);

    return doc.output('blob');
  }

  /**
   * Gathers every string that can end up in the PDF so the matching fonts are loaded up front.
   * The data is serialised as a whole because field values are resolved lazily during rendering.
   */
  private collectRenderTexts(
    template: ReportTemplate,
    data: ReportData,
    context: ReportGenerationContext
  ): string[] {
    const texts: string[] = [
      template.name ?? '',
      context.groupName ?? '',
      JSON.stringify(data.rows ?? []),
      JSON.stringify(data.clients ?? []),
      JSON.stringify(data.metadata ?? {}),
      ...(context.provider.collectResolvedLabelTexts?.() ?? []),
    ];

    for (const section of template.sections ?? []) {
      if (section.title) {
        texts.push(section.title);
      }
      for (const row of section.freeTextRows ?? []) {
        texts.push(row.text ?? '');
      }
      for (const field of [...section.fields, ...(section.tableFooterFields ?? [])]) {
        texts.push(field.name ?? '');
        texts.push(resolveReportFieldLabel(field, template, key => this.translate.instant(key), true));
      }
    }

    return texts;
  }

  private collectTemplateFontFamilies(template: ReportTemplate): string[] {
    return (template.sections ?? [])
      .flatMap(section => [...section.fields, ...(section.tableFooterFields ?? [])])
      .map(field => field.style?.fontFamily)
      .filter((family): family is string => !!family);
  }

  private renderPage(
    doc: jsPDF,
    template: ReportTemplate,
    provider: ReportDataProvider,
    rows: ReportRow[],
    headerContext: ReportHeaderContext,
    imageCache: Map<string, string>,
    parameterContext: ReportParameterContext
  ): void {
    let yPos = template.pageSetup.margins.top;
    const marginLeft = template.pageSetup.margins.left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - marginLeft - template.pageSetup.margins.right;

    const ctx: PdfRenderContext = { doc, template, provider, headerContext, imageCache, marginLeft, contentWidth, parameterContext };

    const headerSection = template.sections.find(s => s.type === ReportSectionType.Header);
    if (headerSection?.visible && headerSection.fields.length > 0) {
      yPos = this.headerRenderer.renderHeader(ctx, headerSection, yPos);
      yPos += SECTION_GAP_MM;
    }

    const bodySections = template.sections
      .filter(s => s.type !== ReportSectionType.Header && s.type !== ReportSectionType.Footer)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let lastEffectiveRows = rows;
    for (const section of bodySections) {
      if (!section.visible || section.fields.length === 0) continue;
      const sectionRows = this.rowFilterService.filterRows(
        section,
        this.resolveSectionRows(template, section, rows, headerContext),
        provider,
        parameterContext
      );
      lastEffectiveRows = sectionRows;
      if (sectionRows.length > 0) {
        yPos = this.tableRenderer.renderTable(ctx, section, sectionRows, yPos);
        yPos += SECTION_GAP_MM;
      }
    }

    const footerSection = template.sections.find(s => s.type === ReportSectionType.Footer);
    if (footerSection?.visible && footerSection.fields.length > 0) {
      this.footerRenderer.renderFooter(ctx, footerSection, lastEffectiveRows, yPos);
    }
  }

  private resolveSectionRows(
    template: ReportTemplate,
    section: ReportSection,
    rows: ReportRow[],
    headerContext: ReportHeaderContext
  ): ReportRow[] {
    if (template.sourceId !== SCHEDULE_SOURCE_ID) return rows;
    const filtered = selectRowsForSection(section, rows, template.sourceId);
    const sectionFlag = section.showFullPeriod;
    const effectiveFlag = sectionFlag ?? template.showFullPeriod;
    if (!effectiveFlag) return filtered;
    return this.fillFullPeriod(filtered, headerContext.startDate, headerContext.endDate);
  }

  private async preloadImages(template: ReportTemplate, existingCache?: Map<string, string>): Promise<Map<string, string>> {
    const cache = new Map<string, string>();

    if (existingCache) {
      existingCache.forEach((value, key) => cache.set(key, value));
    }

    const imageFields = template.sections
      .flatMap(s => s.fields)
      .filter(f => f.type === ReportFieldType.Image && f.imageUrl && !cache.has(f.imageUrl!));

    const promises = imageFields.map(async (field) => {
      try {
        const blob = await firstValueFrom(
          this.http.get(`${environment.baseUrl}LoadFile/DownLoad?type=${field.imageUrl}`, { responseType: 'blob' })
        );
        if (blob.type !== PLAIN_TEXT_CONTENT_TYPE) {
          const dataUrl = await this.blobToDataUrl(blob);
          cache.set(field.imageUrl!, dataUrl);
        }
      } catch {
        // ignore failed image loads
      }
    });

    await Promise.all(promises);
    return cache;
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private readRowClientId(row: ReportRow): unknown {
    return 'clientId' in row ? row.clientId : undefined;
  }

  private fillFullPeriod(rows: ReportRow[], startDate: string | undefined, endDate: string | undefined): ReportRow[] {
    const start = parseCalendarDate(startDate);
    const end = parseCalendarDate(endDate);
    if (!start || !end) return rows;
    const rowsByDate = new Map<string, ReportRow[]>();

    for (const row of rows) {
      const key = calendarDateKey((row as IScheduleCell).entryDate);
      if (!rowsByDate.has(key)) rowsByDate.set(key, []);
      rowsByDate.get(key)!.push(row);
    }

    const result: ReportRow[] = [];
    for (let current = start; current <= end; current = addDays(current, 1)) {
      const key = calendarDateKey(current);
      const dayRows = rowsByDate.get(key);
      if (dayRows) {
        result.push(...dayRows);
      } else {
        result.push({
          entryDate: current,
          startTime: '',
          endTime: '',
          changeTime: null,
          surcharges: null,
          amount: null,
          entryName: null,
          abbreviation: null,
          information: null,
        } as Partial<IScheduleCell>);
      }
    }

    return result;
  }
}
