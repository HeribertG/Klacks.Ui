import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IPeriodClosure } from 'src/app/domain/models/period-closure-class';

@Injectable({
  providedIn: 'root',
})
export class DataPeriodClosureService {
  private httpClient = inject(HttpClient);

  closePeriod(startDate: string, endDate: string) {
    return this.httpClient
      .post<IPeriodClosure>(`${environment.baseUrl}PeriodClosures`, { startDate, endDate })
      .pipe(retry(3));
  }

  reopenPeriod(id: string) {
    return this.httpClient
      .delete<boolean>(`${environment.baseUrl}PeriodClosures/${id}`)
      .pipe(retry(3));
  }

  getClosures(start: string, end: string) {
    const params = new HttpParams()
      .set('start', start)
      .set('end', end);
    return this.httpClient
      .get<IPeriodClosure[]>(`${environment.baseUrl}PeriodClosures`, { params })
      .pipe(retry(3));
  }
}
