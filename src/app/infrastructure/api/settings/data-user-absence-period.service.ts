// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for a user's absence periods (holidays, sick leave): the escalation roster skips a
 * user while one is active. Admin-only, not escalation-specific - a plain property of the user.
 * @param appUserId - AppUser.Id (text)
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IUserAbsencePeriod } from 'src/app/domain/interfaces/escalation-roster.interface';

@Injectable({
  providedIn: 'root',
})
export class DataUserAbsencePeriodService {
  private httpClient = inject(HttpClient);

  getByUser(appUserId: string): Observable<IUserAbsencePeriod[]> {
    const params = new HttpParams().set('appUserId', appUserId);
    return this.httpClient.get<IUserAbsencePeriod[]>(
      `${environment.baseUrl}user-absence-periods`,
      { params },
    );
  }

  create(appUserId: string, startDate: string, endDate: string, reason: string | null): Observable<IUserAbsencePeriod> {
    return this.httpClient.post<IUserAbsencePeriod>(`${environment.baseUrl}user-absence-periods`, {
      appUserId,
      startDate,
      endDate,
      reason,
    });
  }

  delete(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${environment.baseUrl}user-absence-periods/${id}`);
  }
}
