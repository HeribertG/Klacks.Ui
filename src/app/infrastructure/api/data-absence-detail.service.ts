import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { AbsenceDetail, IAbsenceDetail } from 'src/app/domain/models/absence-detail-class';

@Injectable({
  providedIn: 'root',
})
export class DataAbsenceDetailService {
  private httpClient = inject(HttpClient);

  readAbsenceDetail(id: string) {
    return this.httpClient
      .get<IAbsenceDetail>(`${environment.baseUrl}AbsenceDetails/${id}`)
      .pipe(retry(3));
  }

  readAbsenceDetailList() {
    return this.httpClient
      .get<IAbsenceDetail[]>(`${environment.baseUrl}AbsenceDetails`)
      .pipe(retry(3));
  }

  addAbsenceDetail(value: AbsenceDetail) {
    return this.httpClient
      .post<IAbsenceDetail>(`${environment.baseUrl}AbsenceDetails`, value)
      .pipe(retry(3));
  }

  updateAbsenceDetail(value: IAbsenceDetail) {
    return this.httpClient
      .put<IAbsenceDetail>(`${environment.baseUrl}AbsenceDetails`, value)
      .pipe(retry(3));
  }

  deleteAbsenceDetail(id: string) {
    return this.httpClient
      .delete<IAbsenceDetail>(`${environment.baseUrl}AbsenceDetails/${id}`)
      .pipe(retry(3));
  }
}
