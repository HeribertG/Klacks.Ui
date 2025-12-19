import { inject, Injectable } from '@angular/core';
import { IWork, Work } from 'src/app/domain/models/schedule-class';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs';
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';
import { HttpClient } from '@angular/common/http';

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

  deleteWork(id: string) {
    return this.httpClient
      .delete<IWork>(`${environment.baseUrl}Works/` + id)
      .pipe(retry(3));
  }

  private setCorrectDate(value: Work) {
    value.from = dateWithLocalTimeCorrection(value.from)!;
    value.until = dateWithLocalTimeCorrection(value.until)!;
  }
}
