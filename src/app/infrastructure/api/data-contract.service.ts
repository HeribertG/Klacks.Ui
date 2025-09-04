import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Contract, IContract } from 'src/app/domain/models/contract-class';
import { retry } from 'rxjs';
import {
  transformNgbDateStructToDate,
  isNgbDateStructOk,
  isOwnTimeStructOk,
  transformOwnTimeToNumber,
  dateWithLocalTimeCorrection,
} from 'src/app/domain/helpers/format-helper';

@Injectable({
  providedIn: 'root',
})
export class DataContractService {
  private httpClient = inject(HttpClient);

  getList() {
    return this.httpClient
      .get<IContract[]>(`${environment.baseUrl}Contracts/`)
      .pipe(retry(3));
  }

  getContract(id: string) {
    return this.httpClient
      .get<IContract>(`${environment.baseUrl}Contracts/` + id)
      .pipe(retry(3));
  }

  addContract(value: Contract) {
    this.updateDatesFromStruct(value);
    this.updateHoursFromStruct(value);
    delete value.id;
    this.deleteUnnecessaryProperties(value);
    return this.httpClient
      .post<IContract>(`${environment.baseUrl}Contracts/`, value)
      .pipe();
  }

  updateContract(value: Contract) {
    this.updateDatesFromStruct(value);
    this.updateHoursFromStruct(value);
    this.deleteUnnecessaryProperties(value);
    return this.httpClient
      .put<IContract>(`${environment.baseUrl}Contracts/`, value)
      .pipe();
  }

  deleteContract(id: string) {
    return this.httpClient
      .delete<IContract>(`${environment.baseUrl}Contracts/` + id)
      .pipe(retry(3));
  }

  private updateDatesFromStruct(value: IContract) {
    if (!value) return;

    if (value.internalValidFrom && isNgbDateStructOk(value.internalValidFrom)) {
      const validFromDate = transformNgbDateStructToDate(
        value.internalValidFrom
      );
      if (validFromDate) {
        value.validFrom = dateWithLocalTimeCorrection(validFromDate) as Date;
      }
    }

    if (
      value.internalValidUntil &&
      isNgbDateStructOk(value.internalValidUntil)
    ) {
      const validUntilDate = transformNgbDateStructToDate(
        value.internalValidUntil
      );
      if (validUntilDate) {
        value.validUntil = dateWithLocalTimeCorrection(validUntilDate);
      }
    } else {
      value.validUntil = undefined;
    }
  }

  private updateHoursFromStruct(value: IContract) {
    if (!value) return;

    if (
      value.internalGuaranteedHours &&
      isOwnTimeStructOk(value.internalGuaranteedHours)
    ) {
      value.guaranteedHoursPerMonth = transformOwnTimeToNumber(
        value.internalGuaranteedHours
      );
    }

    if (
      value.internalMinimumHours &&
      isOwnTimeStructOk(value.internalMinimumHours)
    ) {
      value.minimumHoursPerMonth = transformOwnTimeToNumber(
        value.internalMinimumHours
      );
    }

    if (
      value.internalMaximumHours &&
      isOwnTimeStructOk(value.internalMaximumHours)
    ) {
      value.maximumHoursPerMonth = transformOwnTimeToNumber(
        value.internalMaximumHours
      );
    }
  }

  private deleteUnnecessaryProperties(value: IContract) {
    delete value.internalValidFrom;
    delete value.internalValidUntil;
    if (value.calendarSelection) {
      const calendarId = value.calendarSelection.id;

      value.calendarSelectionId = calendarId;
      delete value.calendarSelection;
    }
  }
}
