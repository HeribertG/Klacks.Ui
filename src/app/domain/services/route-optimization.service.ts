// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { IRouteOptimizationResult } from './route-optimization-result.interface';
import { IAutofillResult } from './autofill-result.interface';
import { ITimeBlock } from './time-block.interface';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

@Injectable({
  providedIn: 'root',
})
export class RouteOptimizationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}RouteOptimization`;

  optimizeRoute(
    shiftIds: string[],
    startBase?: string,
    endBase?: string,
    transportMode: ContainerTransportModeEnum = ContainerTransportModeEnum.byCar,
    timeBlocks: ITimeBlock[] = [],
    containerFromTime?: string
  ): Observable<IRouteOptimizationResult> {
    let params = new HttpParams()
      .set('transportMode', transportMode.toString());

    if (startBase) {
      params = params.set('startBase', startBase);
    }
    if (endBase) {
      params = params.set('endBase', endBase);
    }

    return this.http.post<IRouteOptimizationResult>(
      `${this.apiUrl}/optimize-route`,
      { shiftIds, timeBlocks, containerFromTime },
      { params, context: new HttpContext().set(SKIP_LOADING, true) }
    ).pipe(timeout(120_000));
  }

  autofill(
    containerId: string,
    weekday: number,
    isHoliday: boolean,
    isWeekdayAndHoliday: boolean,
    startBase: string,
    endBase: string,
    fromTime: string,
    untilTime: string,
    transportMode: ContainerTransportModeEnum = ContainerTransportModeEnum.byCar,
    timeRangeTolerance = 0.5,
    timeBlocks: ITimeBlock[] = [],
    additionalAvailableWorkIds: string[] = []
  ): Observable<IAutofillResult> {
    const body = {
      containerId,
      weekday,
      isHoliday,
      isWeekdayAndHoliday,
      startBase,
      endBase,
      fromTime,
      untilTime,
      transportMode,
      timeRangeTolerance,
      timeBlocks,
      additionalAvailableWorkIds,
    };

    return this.http.post<IAutofillResult>(
      `${this.apiUrl}/autofill`,
      body,
      { context: new HttpContext().set(SKIP_LOADING, true) }
    ).pipe(timeout(300_000));
  }
}
