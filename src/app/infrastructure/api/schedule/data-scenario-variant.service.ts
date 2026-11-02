// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for communication with the ScenarioVariants backend endpoint (variants, also called keys, that hold
 * not yet binding shifts). Reads are retried, update and delete only on a transient failure, because a refused write
 * fails the same way every time; create and copy are posts that are not idempotent and therefore never retried. Calendar
 * days leave as wire dates.
 * @param groupId - Group whose variants are listed
 * @param id - Variant ID
 * @param shiftId - Shift to remove from the variant
 * @param request - Create, update or copy payload
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { retryTransientHttpErrors } from 'src/app/infrastructure/helpers/http-retry.helper';
import { SCENARIO_VARIANTS_PATH } from 'src/app/domain/constants/scenario-variant.constants';
import { toCalendarDateWire } from 'src/app/domain/helpers/calendar-date.helper';
import { ICopyShiftsToVariantRequest } from 'src/app/domain/models/schedule/copy-shifts-to-variant-request.interface';
import { ICreateScenarioVariantRequest } from 'src/app/domain/models/schedule/create-scenario-variant-request.interface';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IScenarioVariantCopyResult } from 'src/app/domain/models/schedule/scenario-variant-copy-result.interface';
import { IUpdateScenarioVariantRequest } from 'src/app/domain/models/schedule/update-scenario-variant-request.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';

const RETRY_COUNT = 3;

@Injectable({
  providedIn: 'root',
})
export class DataScenarioVariantService {
  private httpClient = inject(HttpClient);
  private baseUrl = environment.baseUrl + SCENARIO_VARIANTS_PATH;

  getByGroup(groupId: string): Observable<IScenarioVariant[]> {
    return this.httpClient
      .get<IScenarioVariant[]>(`${this.baseUrl}?groupId=${groupId}`)
      .pipe(retry(RETRY_COUNT));
  }

  getShifts(id: string): Observable<IShift[]> {
    return this.httpClient
      .get<IShift[]>(`${this.baseUrl}/${id}/Shifts`)
      .pipe(retry(RETRY_COUNT));
  }

  create(request: ICreateScenarioVariantRequest): Observable<IScenarioVariant> {
    return this.httpClient.post<IScenarioVariant>(this.baseUrl, {
      name: request.name,
      description: request.description,
      groupId: request.groupId,
      fromDate: toCalendarDateWire(request.fromDate),
      untilDate: toCalendarDateWire(request.untilDate),
    });
  }

  update(id: string, request: IUpdateScenarioVariantRequest): Observable<IScenarioVariant> {
    return this.httpClient
      .put<IScenarioVariant>(`${this.baseUrl}/${id}`, {
        name: request.name,
        description: request.description,
        fromDate: toCalendarDateWire(request.fromDate),
        untilDate: toCalendarDateWire(request.untilDate),
      })
      .pipe(retryTransientHttpErrors());
  }

  delete(id: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(retryTransientHttpErrors());
  }

  deleteShift(id: string, shiftId: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.baseUrl}/${id}/Shifts/${shiftId}`)
      .pipe(retryTransientHttpErrors());
  }

  copyShifts(id: string, request: ICopyShiftsToVariantRequest): Observable<IScenarioVariantCopyResult> {
    return this.httpClient.post<IScenarioVariantCopyResult>(`${this.baseUrl}/${id}/CopyShifts`, request);
  }
}
