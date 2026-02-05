import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataReportApiService {
  private http = inject(HttpClient);

  getAllTemplates(): Observable<ReportTemplate[]> {
    return this.http.get<ReportTemplate[]>(`${environment.baseUrl}reporttemplates`);
  }

  getTemplatesByType(type: number): Observable<ReportTemplate[]> {
    return this.http.get<ReportTemplate[]>(`${environment.baseUrl}reporttemplates/by-type/${type}`);
  }

  getTemplateById(id: string): Observable<ReportTemplate> {
    return this.http.get<ReportTemplate>(`${environment.baseUrl}reporttemplates/${id}`);
  }

  createTemplate(template: ReportTemplate): Observable<ReportTemplate> {
    return this.http.post<ReportTemplate>(`${environment.baseUrl}reporttemplates`, template);
  }

  updateTemplate(template: ReportTemplate): Observable<ReportTemplate> {
    return this.http.put<ReportTemplate>(`${environment.baseUrl}reporttemplates/${template.id}`, template);
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.baseUrl}reporttemplates/${id}`);
  }
}
