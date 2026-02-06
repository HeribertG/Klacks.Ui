import { Injectable, inject, signal } from '@angular/core';
import { ReportTemplate, ReportType, DEFAULT_PAGE_SETUP } from '../../models/report/report-template.model';
import { DEFAULT_SECTIONS } from '../../models/report/report-section.model';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';

@Injectable({
  providedIn: 'root'
})
export class DataManagementReportService {
  private apiService = inject(DataReportApiService);

  reportTemplateList = signal<ReportTemplate[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.loadTemplates();
  }

  async loadTemplates(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const templates = await this.apiService.getAllTemplates();
      this.reportTemplateList.set(templates);
    } catch (err) {
      this.error.set('Failed to load report templates');
      console.error('Error loading templates:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  getTemplatesByType(type: ReportType): ReportTemplate[] {
    return this.reportTemplateList().filter(t => t.type === type);
  }

  async addTemplate(template: ReportTemplate): Promise<void> {
    try {
      const created = await this.apiService.createTemplate(template);
      this.reportTemplateList.update(list => [...list, created]);
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  }

  async updateTemplate(updated: ReportTemplate): Promise<void> {
    if (!updated.id) {
      throw new Error('Template ID is required for update');
    }

    try {
      const result = await this.apiService.updateTemplate(updated);
      this.reportTemplateList.update(list =>
        list.map(t => t.id === result.id ? result : t)
      );
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await this.apiService.deleteTemplate(id);
      this.reportTemplateList.update(list => list.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  }

  createDefaultTemplate(type: ReportType = ReportType.Schedule): ReportTemplate {
    return {
      name: 'New Report Template',
      description: '',
      type: type,
      pageSetup: { ...DEFAULT_PAGE_SETUP },
      sections: [...DEFAULT_SECTIONS]
    };
  }
}
