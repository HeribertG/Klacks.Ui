// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Contract, IContract } from 'src/app/domain/models/contract/contract-class';
import { defer, retry } from 'rxjs';
import { toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';

@Injectable({
  providedIn: 'root',
})
export class DataContractService {
  private httpClient = inject(HttpClient);

  getList(page = 0, pageSize = 1000) {
    return this.httpClient
      .get<IContract[]>(`${environment.baseUrl}Contracts/?page=${page}&pageSize=${pageSize}`)
      .pipe(retry(3));
  }

  getContract(id: string) {
    return this.httpClient
      .get<IContract>(`${environment.baseUrl}Contracts/` + id)
      .pipe(retry(3));
  }

  addContract(value: Contract) {
    return defer(() => {
      const { id: _id, ...rest } = value;
      return this.httpClient
        .post<IContract>(`${environment.baseUrl}Contracts/`, this.toWirePayload(rest))
        .pipe();
    });
  }

  updateContract(value: Contract) {
    return defer(() => this.httpClient
      .put<IContract>(`${environment.baseUrl}Contracts/`, this.toWirePayload(value))
      .pipe());
  }

  deleteContract(id: string) {
    return this.httpClient
      .delete<IContract>(`${environment.baseUrl}Contracts/` + id)
      .pipe(retry(3));
  }

  private toWirePayload(value: Omit<IContract, 'id'> | IContract) {
    const { calendarSelection: _calendarSelection, ...rest } = value;

    return {
      ...rest,
      validFrom: value.validFrom ? toCalendarDateWire(value.validFrom) : value.validFrom,
      validUntil: value.validUntil ? toCalendarDateWire(value.validUntil) : undefined,
      calendarSelectionId: value.calendarSelection ? value.calendarSelection.id : value.calendarSelectionId,
    };
  }
}
