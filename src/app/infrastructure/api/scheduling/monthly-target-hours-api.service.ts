// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the company-wide monthly target hours CRUD endpoints.
 * Rows are sparse: only months that actually override the contract target exist.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IMonthlyTargetHours } from 'src/app/domain/models/scheduling/monthly-target-hours.model';

@Injectable({
  providedIn: 'root'
})
export class MonthlyTargetHoursApiService {
  private http = inject(HttpClient);

  getAll(): Promise<IMonthlyTargetHours[]> {
    return firstValueFrom(this.http.get<IMonthlyTargetHours[]>(`${environment.baseUrl}MonthlyTargetHours`).pipe(retry(3)));
  }

  getById(id: string): Promise<IMonthlyTargetHours> {
    return firstValueFrom(this.http.get<IMonthlyTargetHours>(`${environment.baseUrl}MonthlyTargetHours/${id}`).pipe(retry(3)));
  }

  create(row: IMonthlyTargetHours): Promise<IMonthlyTargetHours> {
    const { id: _id, ...payload } = row;
    return firstValueFrom(this.http.post<IMonthlyTargetHours>(`${environment.baseUrl}MonthlyTargetHours`, payload).pipe(retry(3)));
  }

  update(row: IMonthlyTargetHours): Promise<IMonthlyTargetHours> {
    return firstValueFrom(this.http.put<IMonthlyTargetHours>(`${environment.baseUrl}MonthlyTargetHours`, row).pipe(retry(3)));
  }

  delete(id: string): Promise<IMonthlyTargetHours> {
    return firstValueFrom(this.http.delete<IMonthlyTargetHours>(`${environment.baseUrl}MonthlyTargetHours/${id}`).pipe(retry(3)));
  }
}
