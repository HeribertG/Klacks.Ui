import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { BreakContext, IBreakContext } from 'src/app/domain/models/break-context-class';

@Injectable({
  providedIn: 'root',
})
export class DataBreakContextService {
  private httpClient = inject(HttpClient);

  readBreakContext(id: string) {
    return this.httpClient
      .get<IBreakContext>(`${environment.baseUrl}BreakContexts/${id}`)
      .pipe(retry(3));
  }

  readBreakContextList() {
    return this.httpClient
      .get<IBreakContext[]>(`${environment.baseUrl}BreakContexts`)
      .pipe(retry(3));
  }

  addBreakContext(value: BreakContext) {
    return this.httpClient
      .post<IBreakContext>(`${environment.baseUrl}BreakContexts`, value)
      .pipe(retry(3));
  }

  updateBreakContext(value: IBreakContext) {
    return this.httpClient
      .put<IBreakContext>(`${environment.baseUrl}BreakContexts`, value)
      .pipe(retry(3));
  }

  deleteBreakContext(id: string) {
    return this.httpClient
      .delete<IBreakContext>(`${environment.baseUrl}BreakContexts/${id}`)
      .pipe(retry(3));
  }
}
