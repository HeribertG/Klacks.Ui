import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReportTemplate } from '../../models/report/report-template.model';

export interface GenerateReportRequest {
  fromDate: Date;
  toDate: Date;
  templateId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  generateScheduleReport(clientId: string, request: GenerateReportRequest): Observable<Blob> {
    const url = `${this.apiUrl}/reports/schedule/${clientId}`;
    return this.http.post(url, request, { responseType: 'blob' });
  }

  previewScheduleReport(clientId: string, fromDate: Date, toDate: Date): Observable<Blob> {
    const url = `${this.apiUrl}/reports/schedule/${clientId}/preview`;
    const params = new HttpParams()
      .set('fromDate', fromDate.toISOString())
      .set('toDate', toDate.toISOString());
    return this.http.get(url, { params, responseType: 'blob' });
  }

  downloadPdf(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  openPdfPreview(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}
