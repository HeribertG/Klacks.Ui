// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching and persisting qualification master data via the backend API.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataQualificationService {
  private httpClient = inject(HttpClient);

  getQualificationList() {
    return this.httpClient
      .get<IQualification[]>(`${environment.baseUrl}Qualification/GetQualificationList`)
      .pipe(retry(3));
  }

  addQualification(value: IQualification) {
    return this.httpClient
      .post<IQualification>(`${environment.baseUrl}Qualification/AddQualification`, value)
      .pipe(retry(3));
  }

  updateQualification(value: IQualification) {
    return this.httpClient
      .put<IQualification>(`${environment.baseUrl}Qualification/PutQualification`, value)
      .pipe(retry(3));
  }

  deleteQualification(id: string) {
    return this.httpClient
      .delete<void>(`${environment.baseUrl}Qualification/DeleteQualification/${id}`)
      .pipe(retry(3));
  }
}
