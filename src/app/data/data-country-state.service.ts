import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ICountry, IPostCodeCH, IState } from '../core/client-class';
import { retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataCountryStateService {
  private httpClient = inject(HttpClient);

  getCountryList() {
    return this.httpClient
      .get<ICountry[]>(`${environment.baseUrl}Countries/`)
      .pipe();
  }

  getCountry(id: string) {
    return this.httpClient
      .get<ICountry>(`${environment.baseUrl}Countries/` + id)
      .pipe(retry(3));
  }

  updateCountry(value: ICountry) {
    return this.httpClient
      .put<ICountry>(`${environment.baseUrl}Countries/`, value)
      .pipe(retry(3));
  }

  addCountry(value: ICountry) {
    delete value.id;
    return this.httpClient
      .post<ICountry>(`${environment.baseUrl}Countries/`, value)
      .pipe(retry(3));
  }

  deleteCountry(id: string) {
    return this.httpClient
      .delete<ICountry>(`${environment.baseUrl}Countries/` + id)
      .pipe(retry(3));
  }

  GetStateList() {
    return this.httpClient
      .get<IState[]>(`${environment.baseUrl}States/`)
      .pipe(retry(3));
  }

  getState(id: string) {
    return this.httpClient
      .get<IState>(`${environment.baseUrl}States/` + id)
      .pipe(retry(3));
  }

  updateState(value: IState) {
    return this.httpClient
      .put<IState>(`${environment.baseUrl}States/`, value)
      .pipe(retry(3));
  }

  addState(value: IState) {
    delete value.id;
    return this.httpClient
      .post<IState>(`${environment.baseUrl}States/`, value)
      .pipe(retry(3));
  }

  deleteState(id: string) {
    return this.httpClient
      .delete<IState>(`${environment.baseUrl}States/` + id)
      .pipe(retry(3));
  }

  SearchCity(zip: string): Promise<IPostCodeCH[] | undefined> {
    return this.httpClient
      .get<IPostCodeCH[] | undefined>(`${environment.baseUrl}PostcodeCh/` + zip)
      .toPromise();
  }
}
