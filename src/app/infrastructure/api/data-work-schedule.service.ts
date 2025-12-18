import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  IWorkScheduleFilter,
  IWorkScheduleResponse,
} from 'src/app/domain/models/work-schedule-class';

@Injectable({
  providedIn: 'root',
})
export class DataWorkScheduleService {
  private httpClient = inject(HttpClient);

  getWorkSchedule(filter: IWorkScheduleFilter) {
    return this.httpClient
      .post<IWorkScheduleResponse>(`${environment.baseUrl}WorkSchedule`, filter)
      .pipe(retry(3));
  }
}
