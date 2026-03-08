// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FloorPlan, IFloorPlan } from 'src/app/domain/models/floor-plan/floor-plan-class';
import { FloorPlanWorkMarker, IFloorPlanWorkMarker } from 'src/app/domain/models/floor-plan/floor-plan-work-marker-class';

@Injectable({
  providedIn: 'root',
})
export class DataFloorPlanService {
  private httpClient = inject(HttpClient);

  list() {
    return this.httpClient
      .get<IFloorPlan[]>(`${environment.baseUrl}FloorPlans`)
      .pipe(retry(3));
  }

  get(id: string) {
    return this.httpClient
      .get<IFloorPlan>(`${environment.baseUrl}FloorPlans/${id}`)
      .pipe(retry(3));
  }

  create(value: FloorPlan) {
    return this.httpClient
      .post<IFloorPlan>(`${environment.baseUrl}FloorPlans`, value)
      .pipe(retry(3));
  }

  update(value: FloorPlan) {
    return this.httpClient
      .put<IFloorPlan>(`${environment.baseUrl}FloorPlans`, value)
      .pipe(retry(3));
  }

  delete(id: string) {
    return this.httpClient
      .delete<void>(`${environment.baseUrl}FloorPlans/${id}`)
      .pipe(retry(3));
  }

  getMarkers(floorPlanId: string) {
    return this.httpClient
      .get<IFloorPlanWorkMarker[]>(`${environment.baseUrl}FloorPlanWorkMarkers/ByFloorPlan/${floorPlanId}`)
      .pipe(retry(3));
  }

  addMarker(marker: FloorPlanWorkMarker) {
    return this.httpClient
      .post<IFloorPlanWorkMarker>(`${environment.baseUrl}FloorPlanWorkMarkers`, marker)
      .pipe(retry(3));
  }

  updateMarker(marker: FloorPlanWorkMarker) {
    return this.httpClient
      .put<IFloorPlanWorkMarker>(`${environment.baseUrl}FloorPlanWorkMarkers`, marker)
      .pipe(retry(3));
  }

  deleteMarker(id: string) {
    return this.httpClient
      .delete<void>(`${environment.baseUrl}FloorPlanWorkMarkers/${id}`)
      .pipe(retry(3));
  }
}
