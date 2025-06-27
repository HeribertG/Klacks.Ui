import { inject, Injectable } from '@angular/core';
import { IGroup } from '../core/group-class';
import { Observable, retry } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {
  dateWithLocalTimeCorrection,
  isNgbDateStructOk,
  transformNgbDateStructToDate,
} from '../helpers/format-helper';

@Injectable({
  providedIn: 'root',
})
export class DataGroupVisibilityService {
  private httpClient = inject(HttpClient);

  getGroupVisibility(id: string): Observable<IGroup> {
    return this.httpClient
      .get<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3));
  }

  updateGroupVisibility(value: IGroup): Observable<IGroup> {
    this.setCorrectDate(value);
    return this.httpClient
      .put<IGroup>(`${environment.baseUrl}Groups/`, value)
      .pipe(retry(3));
  }

  addGroupVisibility(value: IGroup): Observable<IGroup> {
    delete value.id;

    this.setCorrectDate(value);
    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}Groups/`, value)
      .pipe(retry(3));
  }

  deleteGroupVisibility(id: string): Observable<IGroup> {
    return this.httpClient
      .delete<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3));
  }

  setCorrectDate(value: IGroup): void {
    if (isNgbDateStructOk(value!.internalValidFrom)) {
      value.validFrom = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalValidFrom)
      )!;
    } else {
      value.validFrom = new Date();
    }
    value.validFrom = dateWithLocalTimeCorrection(value.validFrom)!;

    if (isNgbDateStructOk(value!.internalValidUntil)) {
      value.validUntil = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalValidUntil)
      )!;
      value.validUntil = dateWithLocalTimeCorrection(value.validUntil)!;
    } else {
      value.validUntil = undefined;
    }
  }
}
