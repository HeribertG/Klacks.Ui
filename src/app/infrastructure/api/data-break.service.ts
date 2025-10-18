import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Break, IBreak, IBreakFilter } from 'src/app/domain/models/break-class';
import { IClientBreak } from 'src/app/domain/models/client-class';
import { dateWithLocalTimeCorrection } from 'src/app/domain/helpers/format-helper';

@Injectable({
  providedIn: 'root',
})
export class DataBreakService {
  private httpClient = inject(HttpClient);

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

  getClientList(filter: IBreakFilter): Observable<{ clients: IClientBreak[], totalCount: number }> {
    return this.httpClient
      .post<IClientBreak[]>(
        `${environment.baseUrl}Breaks/GetClientList/`,
        filter,
        { observe: 'response' }
      )
      .pipe(
        retry(3),
        map((response: HttpResponse<IClientBreak[]>) => {
          const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);
          return {
            clients: response.body || [],
            totalCount: totalCount
          };
        })
      );
  }

  private setCorrectDate(value: Break) {
    value.from = dateWithLocalTimeCorrection(value.from)!;
    value.until = dateWithLocalTimeCorrection(value.until)!;
  }
}
