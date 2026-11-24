// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ICountry, IPostCodeCH, IState } from 'src/app/domain/models/client/client-class';
import { retry } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { retryTransientHttpErrors } from 'src/app/infrastructure/helpers/http-retry.helper';

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
      .pipe(retryTransientHttpErrors());
  }

  addCountry(value: ICountry) {
    delete value.id;
    return this.httpClient
      .post<ICountry>(`${environment.baseUrl}Countries/`, value);
  }

  deleteCountry(id: string) {
    return this.httpClient
      .delete<ICountry>(`${environment.baseUrl}Countries/` + id)
      .pipe(retryTransientHttpErrors());
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
      .pipe(retryTransientHttpErrors());
  }

  addState(value: IState) {
    delete value.id;
    return this.httpClient
      .post<IState>(`${environment.baseUrl}States/`, value);
  }

  deleteState(id: string) {
    return this.httpClient
      .delete<IState>(`${environment.baseUrl}States/` + id)
      .pipe(retryTransientHttpErrors());
  }

  SearchCity(zip: string): Promise<IPostCodeCH[] | undefined> {
    return firstValueFrom(
      this.httpClient
        .get<IPostCodeCH[] | undefined>(`${environment.baseUrl}PostcodeCh/` + zip)
    );
  }
}
