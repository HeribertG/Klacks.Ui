import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs';
import { IScheduleChangeResource } from 'src/app/domain/models/schedule/schedule-change.interface';

@Injectable({
  providedIn: 'root',
})
export class DataScheduleChangeService {
  private httpClient = inject(HttpClient);

  getChanges(startDate: string, endDate: string) {
    return this.httpClient
      .get<IScheduleChangeResource[]>(
        `${environment.baseUrl}ScheduleChanges?startDate=${startDate}&endDate=${endDate}`
      )
      .pipe(retry(3));
  }
}
