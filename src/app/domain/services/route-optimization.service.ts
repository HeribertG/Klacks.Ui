import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ILocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  shiftId: string;
}

export interface IRouteStep extends ILocation {
  order: number;
  distanceToNextKm: number;
  travelTimeToNext: string;
}

export interface IRouteOptimizationResult {
  optimizedRoute: IRouteStep[];
  totalDistanceKm: number;
  estimatedTravelTime: string;
  travelTimeFromStartBase: string;
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
    endBase?: string
  ): Observable<IRouteOptimizationResult> {
    let params = new HttpParams()
      .set('containerId', containerId)
      .set('weekday', weekday.toString())
      .set('isHoliday', isHoliday.toString());

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
