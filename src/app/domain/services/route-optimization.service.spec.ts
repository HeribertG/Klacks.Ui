// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouteOptimizationService } from './route-optimization.service';

describe('RouteOptimizationService autofill', () => {
  let service: RouteOptimizationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RouteOptimizationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RouteOptimizationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts both flags of the container template slot', () => {
    service.autofill('container-1', 3, true, true, 'Base', 'Base', '08:00', '12:00').subscribe();

    const request = http.expectOne(req => req.url.endsWith('RouteOptimization/autofill'));
    expect(request.request.body).toEqual(
      expect.objectContaining({ weekday: 3, isHoliday: true, isWeekdayAndHoliday: true }),
    );
    request.flush({});
  });
});
