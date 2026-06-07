// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP service for shift required qualification CRUD. Communicates with the
 * Shifts/RequiredQualifications endpoints.
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IShiftRequiredQualification } from 'src/app/domain/models/shift/shift-required-qualification-class';
import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';

export interface SetShiftRequiredQualificationRequest {
  shiftId: string;
  qualificationId: string;
  isMandatory: boolean;
  minLevel: QualificationLevel;
}

@Injectable({ providedIn: 'root' })
export class DataShiftQualificationService {
  private readonly baseUrl = `${environment.baseUrl}Shifts/RequiredQualifications`;
  private httpClient = inject(HttpClient);

  getByShiftId(shiftId: string) {
    return this.httpClient
      .get<IShiftRequiredQualification[]>(`${this.baseUrl}/${shiftId}`)
      .pipe(retry(3));
  }

  setRequiredQualification(request: SetShiftRequiredQualificationRequest) {
    return this.httpClient
      .post<string>(`${this.baseUrl}`, request)
      .pipe(retry(3));
  }

  deleteRequiredQualification(id: string) {
    return this.httpClient
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(retry(3));
  }
}
