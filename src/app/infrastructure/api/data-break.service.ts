import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IBreak, Break } from 'src/app/domain/models/break-class';

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
    return this.httpClient
      .post<IBreak>(`${environment.baseUrl}Breaks/`, value)
      .pipe(retry(3));
  }

  updateBreak(value: Break) {
    return this.httpClient
      .put<IBreak>(`${environment.baseUrl}Breaks/`, value)
      .pipe(retry(3));
  }

  deleteBreak(id: string, periodStart: string, periodEnd: string) {
    return this.httpClient
      .delete<IBreak>(`${environment.baseUrl}Breaks/${id}?periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .pipe(retry(3));
  }
}
