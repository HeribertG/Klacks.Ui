// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataScheduleSetupStateService } from './data-schedule-setup-state.service';
import { IScheduleSetupState } from 'src/app/domain/interfaces/schedule-setup-state.interface';
import { environment } from 'src/environments/environment';

describe('DataScheduleSetupStateService', () => {
  let service: DataScheduleSetupStateService;
  let httpMock: HttpTestingController;
  let apiUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataScheduleSetupStateService],
    });
    service = TestBed.inject(DataScheduleSetupStateService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}setup-state`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getState fetches the setup snapshot from setup-state', () => {
    const state: IScheduleSetupState = {
      hasOrders: false,
      hasShifts: false,
      hasWork: false,
      hasCustomers: true,
      hasGroups: false,
    };

    service.getState().subscribe((result) => {
      expect(result).toEqual(state);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(state);
  });
});
