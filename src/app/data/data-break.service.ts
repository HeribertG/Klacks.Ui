import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Break, IBreak, IBreakFilter } from '../core/break-class';
import { IClientBreak } from '../core/client-class';
import { dateWithLocalTimeCorrection } from '../helpers/format-helper';

@Injectable({
  providedIn: 'root',
})
export class DataBreakService {
  constructor(private httpClient: HttpClient) {}

  getBreak(id: string) {
    return this.httpClient
      .get<IBreak>(`${environment.baseUrl}Breaks/${id}`)
      .pipe(retry(3));
  }

  addBreak(value: Break) {
    this.setCorrectDate(value);
    return this.httpClient
      .post<IBreak>(`${environment.baseUrl}Breaks/`, value)
      .pipe(retry(3));
  }

  updateBreak(value: Break) {
    this.setCorrectDate(value);
    return this.httpClient
      .put<IBreak>(`${environment.baseUrl}Breaks/`, value)
      .pipe(retry(3));
  }

  deleteBreak(id: string) {
    return this.httpClient
      .delete<IBreak>(`${environment.baseUrl}Breaks/` + id)
      .pipe(retry(3));
  }

  getClientList(filter: IBreakFilter) {
    return this.httpClient
      .post<IClientBreak[]>(
        `${environment.baseUrl}Breaks/GetClientList/`,
        filter
      )
      .pipe(retry(3));
  }

  private setCorrectDate(value: Break) {
    value.from = dateWithLocalTimeCorrection(value.from)!;
    value.until = dateWithLocalTimeCorrection(value.until)!;
  }
}
