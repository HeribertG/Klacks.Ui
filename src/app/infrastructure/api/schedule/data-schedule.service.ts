import { inject, Injectable } from '@angular/core';
import { IWork, Work } from 'src/app/domain/models/schedule-class';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs';
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';
import { HttpClient } from '@angular/common/http';
import { BulkDeleteWorksRequest } from '../dtos/bulk-delete-works-request.dto';
import { BulkAddWorksRequest } from '../dtos/bulk-add-works-request.dto';
import { BulkWorksResponse } from '../dtos/bulk-works-response.dto';

@Injectable({
  providedIn: 'root',
})
export class DataScheduleService {
  private httpClient = inject(HttpClient);

  getWork(id: string) {
    return this.httpClient
      .get<IWork>(`${environment.baseUrl}Works/${id}`)
      .pipe(retry(3));
  }

  addWork(value: Work) {
    this.setCorrectDate(value);
    return this.httpClient
      .post<IWork>(`${environment.baseUrl}Works/`, value)
      .pipe(retry(3));
  }

  updateWork(value: Work) {
    this.setCorrectDate(value);
    return this.httpClient
      .put<IWork>(`${environment.baseUrl}Works/`, value)
      .pipe(retry(3));
  }

  deleteWork(id: string, periodStart: string, periodEnd: string) {
    return this.httpClient
      .delete<IWork>(`${environment.baseUrl}Works/${id}?periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .pipe(retry(3));
  }

  bulkDeleteWorks(workIds: string[]) {
    const request: BulkDeleteWorksRequest = { workIds };
    return this.httpClient
      .delete<BulkWorksResponse>(`${environment.baseUrl}Works/Bulk`, { body: request })
      .pipe(retry(3));
  }

  bulkAddWorks(request: BulkAddWorksRequest) {
    return this.httpClient
      .post<BulkWorksResponse>(`${environment.baseUrl}Works/Bulk`, request)
      .pipe(retry(3));
  }

  confirmWork(workId: string) {
    return this.httpClient
      .post<IWork>(`${environment.baseUrl}Works/${workId}/Confirm`, {})
      .pipe(retry(3));
  }

  unconfirmWork(workId: string) {
    return this.httpClient
      .post<IWork>(`${environment.baseUrl}Works/${workId}/Unconfirm`, {})
      .pipe(retry(3));
  }

  approveDay(date: string, groupId: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/ApproveDay`, { date, groupId })
      .pipe(retry(3));
  }

  revokeDayApproval(date: string, groupId: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/RevokeDayApproval`, { date, groupId })
      .pipe(retry(3));
  }

  closePeriod(startDate: string, endDate: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/ClosePeriod`, { startDate, endDate })
      .pipe(retry(3));
  }

  reopenPeriod(startDate: string, endDate: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/ReopenPeriod`, { startDate, endDate })
      .pipe(retry(3));
  }

  private setCorrectDate(value: Work) {
    value.currentDate = dateWithLocalTimeCorrection(value.currentDate)!;
  }
}
