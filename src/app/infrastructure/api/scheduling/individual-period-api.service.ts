// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the IndividualPeriod CRUD endpoints. Sends the full aggregate
 * (including all periods rows) on create/update, matching the backend contract.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IIndividualPeriod } from 'src/app/domain/models/scheduling/individual-period.model';
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root'
})
export class IndividualPeriodApiService {
  private http = inject(HttpClient);

  getAll(page = 0, pageSize = 1000): Promise<IIndividualPeriod[]> {
    return firstValueFrom(this.http.get<IIndividualPeriod[]>(`${environment.baseUrl}IndividualPeriods?page=${page}&pageSize=${pageSize}`).pipe(retry(3)));
  }

  getById(id: string): Promise<IIndividualPeriod> {
    return firstValueFrom(this.http.get<IIndividualPeriod>(`${environment.baseUrl}IndividualPeriods/${id}`).pipe(retry(3)));
  }

  create(period: IIndividualPeriod): Promise<IIndividualPeriod> {
    const { id: _id, ...payload } = this.correctDates(period);
    return firstValueFrom(this.http.post<IIndividualPeriod>(`${environment.baseUrl}IndividualPeriods`, payload).pipe(retry(3)));
  }

  update(period: IIndividualPeriod): Promise<IIndividualPeriod> {
    const payload = this.correctDates(period);
    return firstValueFrom(this.http.put<IIndividualPeriod>(`${environment.baseUrl}IndividualPeriods`, payload).pipe(retry(3)));
  }

  delete(id: string): Promise<IIndividualPeriod> {
    return firstValueFrom(this.http.delete<IIndividualPeriod>(`${environment.baseUrl}IndividualPeriods/${id}`).pipe(retry(3)));
  }

  private correctDates(period: IIndividualPeriod): IIndividualPeriod {
    return {
      ...period,
      periods: period.periods.map(row => ({
        ...row,
        fromDate: dateWithLocalTimeCorrection(row.fromDate) as Date,
        untilDate: row.untilDate ? dateWithLocalTimeCorrection(row.untilDate) : undefined,
      })),
    };
  }
}
