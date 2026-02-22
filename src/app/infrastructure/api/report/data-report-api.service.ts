// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';

@Injectable({
  providedIn: 'root'
})
export class DataReportApiService {
  private http = inject(HttpClient);

  getAllTemplates(): Promise<ReportTemplate[]> {
    return firstValueFrom(this.http.get<ReportTemplate[]>(`${environment.baseUrl}reporttemplates`));
  }

  getTemplatesByType(type: number): Promise<ReportTemplate[]> {
    return firstValueFrom(this.http.get<ReportTemplate[]>(`${environment.baseUrl}reporttemplates/by-type/${type}`));
  }

  getTemplateById(id: string): Promise<ReportTemplate> {
    return firstValueFrom(this.http.get<ReportTemplate>(`${environment.baseUrl}reporttemplates/${id}`));
  }

  createTemplate(template: ReportTemplate): Promise<ReportTemplate> {
    return firstValueFrom(this.http.post<ReportTemplate>(`${environment.baseUrl}reporttemplates`, template));
  }

  updateTemplate(template: ReportTemplate): Promise<ReportTemplate> {
    return firstValueFrom(this.http.put<ReportTemplate>(`${environment.baseUrl}reporttemplates/${template.id}`, template));
  }

  deleteTemplate(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${environment.baseUrl}reporttemplates/${id}`));
  }
}
