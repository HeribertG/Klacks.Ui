import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SendScheduleReportResponse } from './send-schedule-report-response.model';

@Injectable({
  providedIn: 'root',
})
export class DataScheduleReportApiService {
  private http = inject(HttpClient);

  sendScheduleReport(
    clientId: string,
    clientName: string,
    startDate: string,
    endDate: string,
    pdfBlob: Blob,
    fileName: string,
  ): Promise<SendScheduleReportResponse> {
    const formData = new FormData();
    formData.append('clientId', clientId);
    formData.append('clientName', clientName);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('pdfFile', pdfBlob, fileName);

    return firstValueFrom(
      this.http.post<SendScheduleReportResponse>(
        `${environment.baseUrl}ScheduleReport/send`,
        formData,
      ),
    );
  }
}
