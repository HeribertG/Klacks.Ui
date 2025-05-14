import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, retry, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IShift } from '../core/schedule-class';
import {
  dateWithLocalTimeCorrection,
  isNgbDateStructOk,
  transformNgbDateStructToDate,
} from '../helpers/format-helper';
import { ITruncatedShift, ShiftFilter } from '../core/shift-data-class';

@Injectable({
  providedIn: 'root',
})
export class DataShiftService {
  private httpClient = inject(HttpClient);

  readShiftList(filter: ShiftFilter) {
    return this.httpClient
      .post<ITruncatedShift>(
        `${environment.baseUrl}Shifts/GetSimpleList/`,
        filter
      )
      .pipe();
  }

  getShift(id: string) {
    return this.httpClient
      .get<IShift>(`${environment.baseUrl}Shifts/` + id)
      .pipe(retry(3));
  }

  updateShift(value: IShift) {
    this.setCorrectDate(value);
    return this.httpClient
      .put<IShift>(`${environment.baseUrl}Shifts/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  addShift(value: IShift) {
    delete value.id;
    this.setCorrectDate(value);
    return this.httpClient
      .post<IShift>(`${environment.baseUrl}Shifts/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  deleteShift(id: string) {
    return this.httpClient
      .delete<IShift>(`${environment.baseUrl}Shifts/` + id)
      .pipe(retry(3), catchError(this.handleError));
  }

  private setCorrectDate(value: IShift) {
    if (isNgbDateStructOk(value!.internalFromDate)) {
      value.fromDate = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalFromDate)
      )!;
    } else {
      value.fromDate = new Date();
    }
    value.fromDate = dateWithLocalTimeCorrection(value.fromDate)!;

    if (isNgbDateStructOk(value!.internalUntilDate)) {
      value.untilDate = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalUntilDate)
      )!;
      value.untilDate = dateWithLocalTimeCorrection(value.untilDate)!;
    } else {
      value.untilDate = undefined;
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
