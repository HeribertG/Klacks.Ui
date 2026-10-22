// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLUGIN_BACKEND_API_URL } from 'klacks-plugin-contracts';
import { DataFloorPlanService } from './data-floor-plan.service';

const BACKEND_API_URL = 'https://plugin.test/api/backend/';

describe('DataFloorPlanService', () => {
  let service: DataFloorPlanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLUGIN_BACKEND_API_URL, useValue: BACKEND_API_URL },
      ],
    });
    service = TestBed.inject(DataFloorPlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists the floor plans below the backend API url of the host', () => {
    // Act
    service.list().subscribe();

    // Assert
    const request = httpMock.expectOne(`${BACKEND_API_URL}FloorPlans`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('reads the work markers of a floor plan below the backend API url of the host', () => {
    // Act
    service.getMarkers('plan-1').subscribe();

    // Assert
    const request = httpMock.expectOne(`${BACKEND_API_URL}FloorPlanWorkMarkers/ByFloorPlan/plan-1`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
