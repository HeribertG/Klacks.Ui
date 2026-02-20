import { Injectable, inject, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { ReportDataProviderService } from './report-data-provider.service';
import { ReportPdfService, ReportGenerationContext } from './report-pdf.service';
import { ReportService } from './report.service';
import { AbsenceLookupService } from '../schedule/absence-lookup.service';
import { ReportDefaultsService } from './report-defaults.service';

@Injectable({ providedIn: 'root' })
export class ScheduleReportContextService {
  private reportApi = inject(DataReportApiService);
  private parentInjector = inject(EnvironmentInjector);
  private reportDefaults = inject(ReportDefaultsService);

  async generateForClient(clientId: string, clientName: string, startDate: string, endDate: string): Promise<void> {
    const templateId = this.reportDefaults.getDefaultTemplateId('schedule');
    if (!templateId) return;

    const template = await this.reportApi.getTemplateById(templateId);
    if (!template) return;

    const childInjector = createEnvironmentInjector(
      [ReportDataProviderService, ReportPdfService, ReportService, AbsenceLookupService],
      this.parentInjector,
    );

    try {
      const dataProviderService = childInjector.get(ReportDataProviderService);
      const pdfService = childInjector.get(ReportPdfService);
      const reportService = childInjector.get(ReportService);

      const provider = dataProviderService.getProvider('schedule', template.dataSetIds ?? ['work']);
      const data = await provider.fetchData({ startDate, endDate, clientId });

      const context: ReportGenerationContext = {
        template,
        provider,
        data,
        groupName: '',
        startDate: data.metadata?.['startDate'] ?? startDate,
        endDate: data.metadata?.['endDate'] ?? endDate,
      };

      const blob = await pdfService.generatePdf(context);
      reportService.openPdfPreview(blob);
    } finally {
      childInjector.destroy();
    }
  }

  async sendForClient(clientId: string, clientName: string, startDate: string, endDate: string): Promise<void> {
    const templateId = this.reportDefaults.getDefaultTemplateId('schedule');
    if (!templateId) return;

    const template = await this.reportApi.getTemplateById(templateId);
    if (!template) return;

    const childInjector = createEnvironmentInjector(
      [ReportDataProviderService, ReportPdfService, ReportService, AbsenceLookupService],
      this.parentInjector,
    );

    try {
      const dataProviderService = childInjector.get(ReportDataProviderService);
      const pdfService = childInjector.get(ReportPdfService);
      const reportService = childInjector.get(ReportService);

      const provider = dataProviderService.getProvider('schedule', template.dataSetIds ?? ['work']);
      const data = await provider.fetchData({ startDate, endDate, clientId });

      const context: ReportGenerationContext = {
        template,
        provider,
        data,
        groupName: '',
        startDate: data.metadata?.['startDate'] ?? startDate,
        endDate: data.metadata?.['endDate'] ?? endDate,
      };

      const blob = await pdfService.generatePdf(context);
      reportService.openPdfPreview(blob);
    } finally {
      childInjector.destroy();
    }
  }
}
