import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';

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

@Injectable({
  providedIn: 'root',
})
export class RouteOptimizationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}RouteOptimization`;

  optimizeRoute(
    containerId: string,
    weekday: number,
    isHoliday: boolean,
    startBase?: string,
    endBase?: string,
    transportMode: ContainerTransportModeEnum = ContainerTransportModeEnum.byCar
  ): Observable<IRouteOptimizationResult> {
    let params = new HttpParams()
      .set('containerId', containerId)
      .set('weekday', weekday.toString())
      .set('isHoliday', isHoliday.toString())
      .set('transportMode', transportMode.toString());

    if (startBase) {
      params = params.set('startBase', startBase);
    }
    if (endBase) {
      params = params.set('endBase', endBase);
    }

    return this.http.get<IRouteOptimizationResult>(
      `${this.apiUrl}/optimize-route`,
      { params }
    );
  }
}
