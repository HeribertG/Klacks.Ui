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
  placedTimeBlocks?: ITimeBlockResult[];
}

export interface IAutofillResult extends IRouteOptimizationResult {
  selectedShiftIds: string[];
  totalWorkTime: string;
  remainingTime: string;
  totalAvailableShifts: number;
  selectedShiftCount: number;
  placedTimeBlocks?: ITimeBlockResult[];
}

export interface ITimeBlock {
  id: string;
  fixedStartTime?: string;
  fixedEndTime?: string;
  durationMinutes: number;
  isMovable: boolean;
}

export interface ITimeBlockResult {
  id: string;
  startTime: string;
  endTime: string;
  insertionPosition: number;
  isMovable: boolean;
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
