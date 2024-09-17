import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { catchError, retry } from 'rxjs/operators';
import { GroupFilter, IGroup, ITruncatedGroup } from '../core/group-class';
import {
  dateWithLocalTimeCorrection,
  isNgbDateStructOk,
  transformNgbDateStructToDate,
} from '../helpers/format-helper';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataGroupService {
  constructor(private httpClient: HttpClient) {}

  readGroupList(filter: GroupFilter) {
    return this.httpClient
      .post<ITruncatedGroup>(
        `${environment.baseUrl}Groups/GetSimpleList/`,
        filter
      )
      .pipe();
  }

  getGroup(id: string) {
    return this.httpClient
      .get<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3));
  }

  updateGroup(value: IGroup) {
    this.setCorrectDate(value);
    return this.httpClient
      .put<IGroup>(`${environment.baseUrl}Groups/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  addGroup(value: IGroup) {
    delete value.id;
    this.setCorrectDate(value);
    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}Groups/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  deleteGroup(id: string) {
    return this.httpClient
      .delete<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3), catchError(this.handleError));
  }

  private setCorrectDate(value: IGroup) {
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

  private handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Client
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server
      errorMessage = `Statuscode: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(errorMessage);
  }
}
