// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal } from '@angular/core';
import { ReportTemplate, ReportType, DEFAULT_PAGE_SETUP } from '../../models/report/report-template.model';
import { DEFAULT_SECTIONS, ReportSectionType } from '../../models/report/report-section.model';
import { DEFAULT_FIELD_STYLE, ReportFieldType, TextAlignment } from '../../models/report/report-field.model';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';

@Injectable()
export class DataManagementReportService {
  private apiService = inject(DataReportApiService);

  reportTemplateList = signal<ReportTemplate[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.loadTemplates().catch(() => undefined);
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
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  getTemplatesByType(type: ReportType): ReportTemplate[] {
    return this.reportTemplateList().filter(t => t.type === type);
  }

  async addTemplate(template: ReportTemplate): Promise<ReportTemplate> {
    try {
      const created = await this.apiService.createTemplate(template);
      this.reportTemplateList.update(list => [
        ...list.filter(t => !(t.isLocal && !t.id)),
        created,
      ]);
      return created;
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

  /**
   * Creates a server-side copy of a template.
   * @param source - Template to copy
   * @param copyName - Name of the copy, already localised by the caller
   */
  async duplicateTemplate(source: ReportTemplate, copyName: string): Promise<ReportTemplate> {
    const copy: ReportTemplate = {
      ...structuredClone({ ...source, id: undefined, createdAt: undefined, updatedAt: undefined }),
      name: copyName,
    };
    return this.addTemplate(copy);
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

  createDefaultTemplate(type: ReportType = ReportType.Schedule, name = 'New Report Template'): ReportTemplate {
    if (type === ReportType.Absence) {
      return this.createDefaultAbsenceTemplate();
    }
    return {
      name,
      description: '',
      type: type,
      pageSetup: { ...DEFAULT_PAGE_SETUP },
      sections: [...DEFAULT_SECTIONS]
    };
  }

  private createDefaultAbsenceTemplate(): ReportTemplate {
    const headerStyle = { ...DEFAULT_FIELD_STYLE, fontSize: 14, bold: true };
    const dateStyle = { ...DEFAULT_FIELD_STYLE, fontSize: 10 };
    const tableStyle = { ...DEFAULT_FIELD_STYLE, fontSize: 10 };
    const footerStyle = { ...DEFAULT_FIELD_STYLE, fontSize: 10, bold: true };

    return {
      name: 'Absence Report',
      description: '',
      type: ReportType.Absence,
      sourceId: 'absence-gantt',
      dataSetIds: ['absences'],
      pageSetup: { ...DEFAULT_PAGE_SETUP },
      sections: [
        {
          type: ReportSectionType.Header,
          visible: true,
          sortOrder: 0,
          fields: [
            { name: 'Name', dataBinding: 'client.name', type: ReportFieldType.Text, width: 30, height: 0, style: headerStyle, sortOrder: 0 },
            { name: 'Vorname', dataBinding: 'client.firstName', type: ReportFieldType.Text, width: 30, height: 0, style: headerStyle, sortOrder: 0 },
            { name: 'Report-Datum', dataBinding: 'report.date', type: ReportFieldType.Date, width: 25, height: 0, style: dateStyle, sortOrder: 1 },
          ],
        },
        {
          type: ReportSectionType.WorkTable,
          visible: true,
          sortOrder: 1,
          fields: [
            { name: 'Von', dataBinding: 'absence.from', type: ReportFieldType.Date, width: 15, height: 0, style: tableStyle, sortOrder: 0 },
            { name: 'Bis', dataBinding: 'absence.until', type: ReportFieldType.Date, width: 15, height: 0, style: tableStyle, sortOrder: 1 },
            { name: 'Abwesenheit', dataBinding: 'absence.absenceName', type: ReportFieldType.Text, width: 25, height: 0, style: tableStyle, sortOrder: 2 },
            { name: 'Wert', dataBinding: 'absence.value', type: ReportFieldType.Number, width: 10, height: 0, style: { ...tableStyle, alignment: TextAlignment.Center }, sortOrder: 3 },
            { name: 'Information', dataBinding: 'absence.information', type: ReportFieldType.Text, width: 30, height: 0, style: tableStyle, sortOrder: 4 },
          ],
        },
        {
          type: ReportSectionType.Footer,
          visible: true,
          sortOrder: 2,
          fields: [
            { name: 'Anzahl', dataBinding: 'absence.totalCount', type: ReportFieldType.Number, width: 25, height: 0, style: footerStyle, sortOrder: 0 },
          ],
        },
      ],
    };
  }
}
