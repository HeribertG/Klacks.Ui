import { Injectable, signal } from '@angular/core';
import { ReportTemplate, ReportType, DEFAULT_PAGE_SETUP } from '../../models/report/report-template.model';
import { DEFAULT_SECTIONS } from '../../models/report/report-section.model';

@Injectable({
  providedIn: 'root'
})
export class DataManagementReportService {
  reportTemplateList = signal<ReportTemplate[]>([]);

  constructor() {
    // Initialize with some default templates
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'default-schedule',
        name: 'Standard Einsatzplan',
        description: 'Standardvorlage für Wocheneinsatzpläne',
        type: ReportType.Schedule,
        pageSetup: { ...DEFAULT_PAGE_SETUP },
        sections: [...DEFAULT_SECTIONS]
      }
    ];
    this.reportTemplateList.set(defaultTemplates);
  }

  getTemplatesByType(type: ReportType): ReportTemplate[] {
    return this.reportTemplateList().filter(t => t.type === type && !t.isDeleted);
  }

  addTemplate(template: ReportTemplate): void {
    this.reportTemplateList.update(list => [...list, template]);
  }

  updateTemplate(updated: ReportTemplate): void {
    this.reportTemplateList.update(list =>
      list.map(t => t.id === updated.id ? updated : t)
    );
  }

  deleteTemplate(id: string): void {
    this.reportTemplateList.update(list =>
      list.map(t => t.id === id ? { ...t, isDeleted: true } : t)
    );
  }
}
