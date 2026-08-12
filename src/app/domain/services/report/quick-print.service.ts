// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Prints the configured default report template of a data source as a PDF preview.
 * Loads the report defaults on demand, resolves the template, fetches the data
 * through the matching provider and opens the rendered PDF in a new tab.
 * @param sourceId - Report data source the quick print is executed for
 * @param fallbackDataSetIds - Data sets used when the template carries no own selection
 * @param params - Fetch arguments handed to the data provider (clientId, groupId, dates)
 * @param groupName - Optional group caption printed in the report header
 */

import { Injectable, inject, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { ReportDataProviderService, ReportFetchParams } from './report-data-provider.service';
import { ReportPdfService, ReportGenerationContext } from './report-pdf.service';
import { ReportService } from './report.service';
import { AbsenceLookupService } from '../schedule/absence-lookup.service';
import { ReportDefaultsService } from './report-defaults.service';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';

export enum QuickPrintOutcome {
  Success = 'success',
  NoDefaultTemplate = 'noDefaultTemplate',
  TemplateNotFound = 'templateNotFound',
  Failed = 'failed',
}

export interface QuickPrintRequest {
  sourceId: string;
  fallbackDataSetIds: string[];
  params: ReportFetchParams;
  groupName?: string;
}

@Injectable({ providedIn: 'root' })
export class QuickPrintService {
  private reportApi = inject(DataReportApiService);
  private parentInjector = inject(EnvironmentInjector);
  private reportDefaults = inject(ReportDefaultsService);

  async ensureDefaultsLoaded(): Promise<void> {
    if (!this.reportDefaults.isLoaded()) {
      await this.reportDefaults.load();
    }
  }

  hasDefault(sourceId: string): boolean {
    return this.reportDefaults.hasDefault(sourceId);
  }

  async print(request: QuickPrintRequest): Promise<QuickPrintOutcome> {
    await this.ensureDefaultsLoaded();
    const templateId = this.reportDefaults.getDefaultTemplateId(request.sourceId);
    if (!templateId) {
      return QuickPrintOutcome.NoDefaultTemplate;
    }

    let template: ReportTemplate | undefined;
    try {
      template = await this.reportApi.getTemplateById(templateId);
    } catch {
      return QuickPrintOutcome.TemplateNotFound;
    }
    if (!template) {
      return QuickPrintOutcome.TemplateNotFound;
    }

    const childInjector = createEnvironmentInjector(
      [ReportDataProviderService, ReportPdfService, ReportService, AbsenceLookupService],
      this.parentInjector,
    );

    try {
      const dataProviderService = childInjector.get(ReportDataProviderService);
      const pdfService = childInjector.get(ReportPdfService);
      const reportService = childInjector.get(ReportService);

      const dataSetIds = template.dataSetIds?.length ? template.dataSetIds : request.fallbackDataSetIds;
      const provider = dataProviderService.getProvider(request.sourceId, dataSetIds);
      const data = await provider.fetchData(request.params);

      const context: ReportGenerationContext = {
        template,
        provider,
        data,
        groupName: request.groupName ?? '',
        startDate: data.metadata?.['startDate'] ?? request.params.startDate ?? '',
        endDate: data.metadata?.['endDate'] ?? request.params.endDate ?? '',
      };

      const blob = await pdfService.generatePdf(context);
      reportService.openPdfPreview(blob);
      return QuickPrintOutcome.Success;
    } catch {
      return QuickPrintOutcome.Failed;
    } finally {
      childInjector.destroy();
    }
  }
}
