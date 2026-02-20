import { Injectable, inject, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { DataScheduleReportApiService } from 'src/app/infrastructure/api/report/data-schedule-report-api.service';
import { SendScheduleReportResponse } from 'src/app/infrastructure/api/report/send-schedule-report-response.model';
import { BulkSendResult } from 'src/app/domain/models/report/bulk-send-result.model';
import { ReportDataProviderService } from './report-data-provider.service';
import { ReportPdfService, ReportGenerationContext } from './report-pdf.service';
import { ReportService } from './report.service';
import { AbsenceLookupService } from '../schedule/absence-lookup.service';
import { ReportDefaultsService } from './report-defaults.service';

@Injectable({ providedIn: 'root' })
export class ScheduleReportContextService {
  private reportApi = inject(DataReportApiService);
  private scheduleReportApi = inject(DataScheduleReportApiService);
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

  async sendForClient(
    clientId: string,
    clientName: string,
    startDate: string,
    endDate: string,
  ): Promise<SendScheduleReportResponse | undefined> {
    const templateId = this.reportDefaults.getDefaultTemplateId('schedule');
    if (!templateId) return undefined;

    const template = await this.reportApi.getTemplateById(templateId);
    if (!template) return undefined;

    const childInjector = createEnvironmentInjector(
      [ReportDataProviderService, ReportPdfService, AbsenceLookupService],
      this.parentInjector,
    );

    try {
      const dataProviderService = childInjector.get(ReportDataProviderService);
      const pdfService = childInjector.get(ReportPdfService);

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
      const fileName = `Dienstplan_${clientName.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`;

      return await this.scheduleReportApi.sendScheduleReport(
        clientId,
        clientName,
        startDate,
        endDate,
        blob,
        fileName,
      );
    } finally {
      childInjector.destroy();
    }
  }

  async sendForAllClients(
    clients: { id: string; name: string }[],
    startDate: string,
    endDate: string,
    onProgress?: (current: number, total: number, clientName: string) => void,
  ): Promise<BulkSendResult> {
    const result: BulkSendResult = { success: 0, failed: 0, noEmail: 0, errors: [] };

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      onProgress?.(i + 1, clients.length, client.name);

      try {
        const response = await this.sendForClient(client.id, client.name, startDate, endDate);
        if (!response) {
          result.failed++;
          result.errors.push({ clientName: client.name, error: 'No template configured' });
          continue;
        }

        if (response.success) {
          result.success++;
        } else if (response.errorMessage === 'No email address found for client') {
          result.noEmail++;
        } else {
          result.failed++;
          result.errors.push({ clientName: client.name, error: response.errorMessage ?? 'Unknown error' });
        }
      } catch (e: unknown) {
        result.failed++;
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        result.errors.push({ clientName: client.name, error: errorMsg });
      }
    }

    return result;
  }
}
