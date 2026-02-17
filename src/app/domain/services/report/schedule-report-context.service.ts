import { Injectable, inject, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportDataProviderService } from './report-data-provider.service';
import { ReportPdfService, ReportGenerationContext } from './report-pdf.service';
import { ReportService } from './report.service';
import { AbsenceLookupService } from '../schedule/absence-lookup.service';
import { ScheduleTemplateSelectComponent } from 'src/app/presentation/shared/schedule-template-select/schedule-template-select.component';

@Injectable({ providedIn: 'root' })
export class ScheduleReportContextService {
  private reportApi = inject(DataReportApiService);
  private parentInjector = inject(EnvironmentInjector);
  private modalService = inject(NgbModal);

  async generateForClient(clientId: string, clientName: string, startDate: string, endDate: string): Promise<void> {
    const allTemplates = await this.reportApi.getAllTemplates();
    const scheduleTemplates = allTemplates.filter(t => t.sourceId === 'schedule');

    if (scheduleTemplates.length === 0) {
      alert('No schedule report template available');
      return;
    }

    let template: ReportTemplate;
    if (scheduleTemplates.length === 1) {
      template = scheduleTemplates[0];
    } else {
      const selected = await this.selectTemplate(scheduleTemplates);
      if (!selected) return;
      template = selected;
    }

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

  private selectTemplate(templates: ReportTemplate[]): Promise<ReportTemplate | null> {
    const modalRef = this.modalService.open(ScheduleTemplateSelectComponent, { centered: true });
    modalRef.componentInstance.templates = templates;
    return modalRef.result.catch(() => null);
  }
}
