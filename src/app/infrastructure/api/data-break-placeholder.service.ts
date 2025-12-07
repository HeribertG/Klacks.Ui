import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BreakPlaceholder, IBreakPlaceholder, IBreakFilter } from 'src/app/domain/models/break-class';
import { IClientBreak } from 'src/app/domain/models/client-class';
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root',
})
export class DataBreakPlaceholderService {
  private httpClient = inject(HttpClient);

  getBreak(id: string) {
    return this.httpClient
      .get<IBreakPlaceholder>(`${environment.baseUrl}BreakPlaceholders/${id}`)
      .pipe(retry(3));
  }

  addBreak(value: BreakPlaceholder) {
    this.setCorrectDate(value);
    return this.httpClient
      .post<IBreakPlaceholder>(`${environment.baseUrl}BreakPlaceholders/`, value)
      .pipe(retry(3));
  }

  updateBreak(value: BreakPlaceholder) {
    this.setCorrectDate(value);
    return this.httpClient
      .put<IBreakPlaceholder>(`${environment.baseUrl}BreakPlaceholders/`, value)
      .pipe(retry(3));
  }

  deleteBreak(id: string) {
    return this.httpClient
      .delete<IBreakPlaceholder>(`${environment.baseUrl}BreakPlaceholders/` + id)
      .pipe(retry(3));
  }

  getClientList(filter: IBreakFilter): Observable<{ clients: IClientBreak[], totalCount: number }> {
    return this.httpClient
      .post<IClientBreak[]>(
        `${environment.baseUrl}BreakPlaceholders/GetClientList/`,
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

  private setCorrectDate(value: BreakPlaceholder) {
    value.from = dateWithLocalTimeCorrection(value.from)!;
    value.until = dateWithLocalTimeCorrection(value.until)!;
  }
}
