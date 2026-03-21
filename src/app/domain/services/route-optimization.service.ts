// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

export interface ILocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  shiftId: string;
  briefingTime: string;
  debriefingTime: string;
}

export interface IRouteStep extends ILocation {
  order: number;
  distanceToNextKm: number;
  travelTimeToNext: string;
}

export interface IDirectionStep {
  instruction: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
}

export interface IRouteSegmentDirections {
  fromName: string;
  toName: string;
  transportMode: string;
  distanceKm: number;
  duration: string;
  steps: IDirectionStep[];
}

export interface IRouteOptimizationResult {
  optimizedRoute: IRouteStep[];
  totalDistanceKm: number;
  estimatedTravelTime: string;
  travelTimeFromStartBase: string;
  distanceFromStartBaseKm: number;
  distanceToEndBaseKm: number;
  travelTimeToEndBase: string;
  segmentDirections?: IRouteSegmentDirections[];
  totalBriefingDebriefingTime: string;
}

export interface IAutofillResult extends IRouteOptimizationResult {
  selectedShiftIds: string[];
  totalWorkTime: string;
  remainingTime: string;
  totalAvailableShifts: number;
  selectedShiftCount: number;
}

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
    transportMode: ContainerTransportModeEnum = ContainerTransportModeEnum.byCar
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
      shiftIds,
      { params, context: new HttpContext().set(SKIP_LOADING, true) }
    ).pipe(timeout(120_000));
  }

  autofill(
    containerId: string,
    weekday: number,
    isHoliday: boolean,
    startBase: string,
    endBase: string,
    fromTime: string,
    untilTime: string,
    transportMode: ContainerTransportModeEnum = ContainerTransportModeEnum.byCar,
    timeRangeTolerance: number = 0.5
  ): Observable<IAutofillResult> {
    const params = new HttpParams()
      .set('containerId', containerId)
      .set('weekday', weekday.toString())
      .set('isHoliday', isHoliday.toString())
      .set('startBase', startBase)
      .set('endBase', endBase)
      .set('fromTime', fromTime)
      .set('untilTime', untilTime)
      .set('transportMode', transportMode.toString())
      .set('timeRangeTolerance', timeRangeTolerance.toString());

    return this.http.get<IAutofillResult>(
      `${this.apiUrl}/autofill`,
      { params, context: new HttpContext().set(SKIP_LOADING, true) }
    ).pipe(timeout(300_000));
  }
}
