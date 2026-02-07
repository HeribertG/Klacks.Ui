import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  IShiftScheduleFilter,
  IShiftScheduleResponse,
} from 'src/app/domain/models/schedule/shift-schedule-class';

@Injectable({
  providedIn: 'root',
})
export class DataShiftScheduleService {
  private httpClient = inject(HttpClient);

  getShiftSchedule(filter: IShiftScheduleFilter) {
    return this.httpClient
      .post<IShiftScheduleResponse>(`${environment.baseUrl}Shifts/Schedule`, filter)
      .pipe(retry(3));
  }
}
