// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { Absence } from 'src/app/domain/models/absence/absence-class';
import { AbsenceFilter } from 'src/app/domain/models/absence/absence-filter-class';
import { IAbsence } from 'src/app/domain/models/absence/absence.interface';
import { TruncatedAbsence } from 'src/app/domain/models/absence/truncated-absence-class';

@Injectable({
  providedIn: 'root',
})
export class DataAbsenceService {
  private httpClient = inject(HttpClient);

  readTruncatedAbsence(filter: AbsenceFilter) {
    return this.httpClient
      .post<TruncatedAbsence>(
        `${environment.baseUrl}Absences/GetSimpleAbsenceList`,
        filter
      )
      .pipe(retry(3));
  }

  readAbsence(value: IAbsence) {
    return this.httpClient
      .get<IAbsence>(`${environment.baseUrl}Absences/` + value)
      .pipe(retry(3));
  }

  updateAbsence(value: IAbsence) {
    return this.httpClient
      .put(`${environment.baseUrl}Absences/`, value)
      .pipe(retry(3));
  }

  addAbsence(value: Absence) {
    return this.httpClient
      .post(`${environment.baseUrl}Absences/`, value)
      .pipe(retry(3));
  }

  readAbsenceList() {
    return this.httpClient
      .get<IAbsence[]>(`${environment.baseUrl}Absences/`)
      .pipe(retry(3));
  }

  readVisibleAbsenceList() {
    return this.httpClient
      .get<IAbsence[]>(`${environment.baseUrl}Absences/visible`)
      .pipe(retry(3));
  }

  deleteAbsence(id: string) {
    return this.httpClient
      .delete<IAbsence>(`${environment.baseUrl}Absences/` + id)
      .pipe(retry(3));
  }
}
