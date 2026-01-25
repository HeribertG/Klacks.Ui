import { inject, Injectable } from '@angular/core';
import { IWork, Work } from 'src/app/domain/models/schedule-class';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs';
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';
import { HttpClient } from '@angular/common/http';

export interface BulkDeleteWorksRequest {
  workIds: string[];
}

export interface BulkAddWorkItem {
  clientId: string;
  shiftId: string;
  currentDate: string;
  workTime: number;
  startTime: string;
  endTime: string;
}

export interface BulkAddWorksRequest {
  works: BulkAddWorkItem[];
  periodStart: string;
  periodEnd: string;
}

export interface ShiftDatePair {
  shiftId: string;
  date: string;
}

export interface BulkWorksResponse {
  successCount: number;
  failedCount: number;
  createdIds: string[];
  deletedIds: string[];
  affectedShifts: ShiftDatePair[];
  periodHours?: Record<string, { hours: number; surcharges: number; guaranteedHours: number }>;
}

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

  private setCorrectDate(value: Work) {
    value.currentDate = dateWithLocalTimeCorrection(value.currentDate)!;
  }
}
