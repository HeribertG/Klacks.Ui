import { inject, Injectable } from '@angular/core';
import { IClientWork, IWork, IWorkFilter, Work } from '../core/schedule-class';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs';
import { dateWithLocalTimeCorrection } from '../helpers/format-helper';
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

  getClientList(filter: IWorkFilter) {
    return this.httpClient
      .post<IClientWork[]>(`${environment.baseUrl}Works/GetClientList/`, filter)
      .pipe(retry(3));
  }

  private setCorrectDate(value: Work) {
    value.from = dateWithLocalTimeCorrection(value.from)!;
    value.until = dateWithLocalTimeCorrection(value.until)!;
  }
}
