// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { AppReloadRequestService } from './app-reload-request.service';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { IAppReloadRequest } from 'src/app/domain/interfaces/app-reload-request.interface';

const OUTAGE_REQUEST: IAppReloadRequest = { reason: AppReloadReason.Outage, autoReloadAllowed: true };

describe('AppReloadRequestService', () => {
  it('passes every reload request on to its subscribers', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(AppReloadRequestService);
    const received: IAppReloadRequest[] = [];
    service.requests$.subscribe((request) => received.push(request));

    service.requestReload(OUTAGE_REQUEST);

    expect(received).toEqual([OUTAGE_REQUEST]);
  });
});
