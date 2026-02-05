import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportApiService, GenerateReportRequest } from 'src/app/infrastructure/api/report/report-api.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiService = inject(ReportApiService);

  generateScheduleReport(clientId: string, request: GenerateReportRequest): Observable<Blob> {
    return this.apiService.generateScheduleReport(clientId, request);
  }

  previewScheduleReport(clientId: string, fromDate: Date, toDate: Date): Observable<Blob> {
    return this.apiService.previewScheduleReport(clientId, fromDate, toDate);
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
