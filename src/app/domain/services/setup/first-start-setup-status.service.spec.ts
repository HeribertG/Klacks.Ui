// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { FirstStartSetupStatusService } from './first-start-setup-status.service';

describe('FirstStartSetupStatusService', () => {
  let service: FirstStartSetupStatusService;
  let dataSetupService: any;

  beforeEach(() => {
    dataSetupService = { getFirstStartStatus: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: DataSetupService, useValue: dataSetupService }],
    });
    service = TestBed.inject(FirstStartSetupStatusService);
  });

  it('reports a pending first start and asks again on the next call', async () => {
    dataSetupService.getFirstStartStatus.mockReturnValue(of({ requiresOwnAdmin: true, passwordPolicy: null }));

    expect(await service.isPending()).toBe(true);
    expect(await service.isPending()).toBe(true);
    expect(dataSetupService.getFirstStartStatus).toHaveBeenCalledTimes(2);
  });

  it('remembers a "no" and stops asking', async () => {
    dataSetupService.getFirstStartStatus.mockReturnValue(of({ requiresOwnAdmin: false, passwordPolicy: null }));

    expect(await service.isPending()).toBe(false);
    expect(await service.isPending()).toBe(false);
    expect(dataSetupService.getFirstStartStatus).toHaveBeenCalledTimes(1);
  });

  it('treats a failed probe as "no" without remembering it', async () => {
    dataSetupService.getFirstStartStatus.mockReturnValueOnce(throwError(() => new Error('offline')));
    dataSetupService.getFirstStartStatus.mockReturnValueOnce(of({ requiresOwnAdmin: true, passwordPolicy: null }));

    expect(await service.isPending()).toBe(false);
    expect(await service.isPending()).toBe(true);
  });

  it('stops asking once the setup was completed here', async () => {
    service.markCompleted();

    expect(await service.isPending()).toBe(false);
    expect(dataSetupService.getFirstStartStatus).not.toHaveBeenCalled();
  });
});
