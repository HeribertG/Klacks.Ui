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
  private apiUrl = environment.baseUrl;

  getAllTemplates(): Observable<ReportTemplate[]> {
    return this.http.get<ReportTemplate[]>(`${this.apiUrl}/reporttemplates`);
  }

  getTemplatesByType(type: number): Observable<ReportTemplate[]> {
    return this.http.get<ReportTemplate[]>(`${this.apiUrl}/reporttemplates/by-type/${type}`);
  }

  getTemplateById(id: string): Observable<ReportTemplate> {
    return this.http.get<ReportTemplate>(`${this.apiUrl}/reporttemplates/${id}`);
  }

  createTemplate(template: ReportTemplate): Observable<ReportTemplate> {
    return this.http.post<ReportTemplate>(`${this.apiUrl}/reporttemplates`, template);
  }

  updateTemplate(template: ReportTemplate): Observable<ReportTemplate> {
    return this.http.put<ReportTemplate>(`${this.apiUrl}/reporttemplates/${template.id}`, template);
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reporttemplates/${id}`);
  }
}
