// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { REPORT_DATA_SOURCES } from 'src/app/domain/models/report/report-data-source.model';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';

@Component({
  selector: 'app-report-defaults',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SettingsListCardComponent],
  templateUrl: './report-defaults.component.html',
  styleUrls: ['./report-defaults.component.scss'],
})
export class ReportDefaultsComponent implements OnInit {
  private reportDefaults = inject(ReportDefaultsService);
  private reportApi = inject(DataReportApiService);
  translate = inject(TranslateService);

  dataSources = REPORT_DATA_SOURCES;
  templates = signal<ReportTemplate[]>([]);

  async ngOnInit(): Promise<void> {
    await this.reportDefaults.load();
    try {
      const all = await this.reportApi.getAllTemplates();
      this.templates.set(all);
    } catch {
      this.templates.set([]);
    }
  }

  getDefault(sourceId: string): string {
    return this.reportDefaults.getDefaultTemplateId(sourceId) ?? '';
  }

  getTemplatesForSource(sourceId: string): ReportTemplate[] {
    return this.templates().filter(t => t.sourceId === sourceId && t.id);
  }

  async onDefaultChange(sourceId: string, templateId: string): Promise<void> {
    await this.reportDefaults.setDefault(sourceId, templateId || null);
  }
}
