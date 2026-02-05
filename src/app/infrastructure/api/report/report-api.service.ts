import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

export interface GenerateReportRequest {
  fromDate: Date;
  toDate: Date;
  templateId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportApiService {
  private http = inject(HttpClient);

  generateScheduleReport(clientId: string, request: GenerateReportRequest): Observable<Blob> {
    const url = `${environment.baseUrl}reports/schedule/${clientId}`;
    return this.http.post(url, request, { responseType: 'blob' });
  }

  previewScheduleReport(clientId: string, fromDate: Date, toDate: Date): Observable<Blob> {
    const url = `${environment.baseUrl}reports/schedule/${clientId}/preview`;
    const params = new HttpParams()
      .set('fromDate', fromDate.toISOString())
      .set('toDate', toDate.toISOString());
    return this.http.get(url, { params, responseType: 'blob' });
  }
}
