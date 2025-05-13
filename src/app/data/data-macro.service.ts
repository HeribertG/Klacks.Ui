import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { IMacro } from '../core/macro-class';

@Injectable({
  providedIn: 'root',
})
export class DataMacroService {
  private httpClient = inject(HttpClient);

  readMacroList() {
    return this.httpClient
      .get<IMacro[]>(`${environment.baseUrl}Settings/Macros`)
      .pipe(retry(3));
  }

  getMacroFilterList() {
    return this.httpClient
      .get<IMacro[]>(`${environment.baseUrl}Settings/Macros/GetMacroFilterList`)
      .pipe(retry(3));
  }

  getMacro(id: string) {
    return this.httpClient
      .get<IMacro>(`${environment.baseUrl}Settings/Macros/` + id)
      .pipe(retry(3));
  }

  updateMacro(value: IMacro) {
    return this.httpClient
      .put<IMacro>(`${environment.baseUrl}Settings/Macros/`, value)
      .pipe(retry(3));
  }

  addMacro(value: IMacro) {
    delete value.id;
    return this.httpClient
      .post<IMacro>(`${environment.baseUrl}Settings/Macros/`, value)
      .pipe(retry(3));
  }

  deleteMacro(id: string) {
    return this.httpClient
      .delete<IMacro>(`${environment.baseUrl}Settings/Macros/` + id)
      .pipe(retry(3));
  }
}
