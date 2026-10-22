// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs';
import { PLUGIN_BACKEND_API_URL } from 'klacks-plugin-contracts';
import { FloorPlan } from '../domain/models/floor-plan-class';
import { IFloorPlan } from '../domain/models/floor-plan.interface';
import { FloorPlanWorkMarker } from '../domain/models/floor-plan-work-marker-class';
import { IFloorPlanWorkMarker } from '../domain/models/floor-plan-work-marker.interface';

@Injectable({
  providedIn: 'root',
})
export class DataFloorPlanService {
  private httpClient = inject(HttpClient);
  private apiUrl = inject(PLUGIN_BACKEND_API_URL);

  list() {
    return this.httpClient
      .get<IFloorPlan[]>(`${this.apiUrl}FloorPlans`)
      .pipe(retry(3));
  }

  get(id: string) {
    return this.httpClient
      .get<IFloorPlan>(`${this.apiUrl}FloorPlans/${id}`)
      .pipe(retry(3));
  }

  create(value: FloorPlan) {
    return this.httpClient
      .post<IFloorPlan>(`${this.apiUrl}FloorPlans`, value)
      .pipe(retry(3));
  }

  update(value: FloorPlan) {
    return this.httpClient
      .put<IFloorPlan>(`${this.apiUrl}FloorPlans`, value)
      .pipe(retry(3));
  }

  delete(id: string) {
    return this.httpClient
      .delete<void>(`${this.apiUrl}FloorPlans/${id}`)
      .pipe(retry(3));
  }

  getMarkers(floorPlanId: string) {
    return this.httpClient
      .get<IFloorPlanWorkMarker[]>(`${this.apiUrl}FloorPlanWorkMarkers/ByFloorPlan/${floorPlanId}`)
      .pipe(retry(3));
  }

  addMarker(marker: FloorPlanWorkMarker) {
    return this.httpClient
      .post<IFloorPlanWorkMarker>(`${this.apiUrl}FloorPlanWorkMarkers`, marker)
      .pipe(retry(3));
  }

  updateMarker(marker: FloorPlanWorkMarker) {
    return this.httpClient
      .put<IFloorPlanWorkMarker>(`${this.apiUrl}FloorPlanWorkMarkers`, marker)
      .pipe(retry(3));
  }

  deleteMarker(id: string) {
    return this.httpClient
      .delete<void>(`${this.apiUrl}FloorPlanWorkMarkers/${id}`)
      .pipe(retry(3));
  }
}
