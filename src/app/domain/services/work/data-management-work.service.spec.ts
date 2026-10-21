// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DataManagementWorkService } from './data-management-work.service';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { AnalyseScenarioService } from '../schedule/analyse-scenario.service';
import { IWork } from 'src/app/domain/models/schedule/work.interface';

describe('DataManagementWorkService', () => {
  let service: DataManagementWorkService;
  let api: {
    confirmWork: ReturnType<typeof vi.fn>;
    unconfirmWork: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = { confirmWork: vi.fn(), unconfirmWork: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DataScheduleService, useValue: api },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => 'scenario-token' } },
      ],
    });
    service = TestBed.inject(DataManagementWorkService);
  });

  it('confirms a work through the API and hands back its response', () => {
    const confirmed = { id: 'work-1' } as IWork;
    api.confirmWork.mockReturnValue(of(confirmed));
    const next = vi.fn();

    service.confirmWork('work-1').subscribe(next);

    expect(api.confirmWork).toHaveBeenCalledWith('work-1');
    expect(next).toHaveBeenCalledWith(confirmed);
  });

  it('unconfirms a work through the API and hands back its response', () => {
    const unconfirmed = { id: 'work-1' } as IWork;
    api.unconfirmWork.mockReturnValue(of(unconfirmed));
    const next = vi.fn();

    service.unconfirmWork('work-1').subscribe(next);

    expect(api.unconfirmWork).toHaveBeenCalledWith('work-1');
    expect(next).toHaveBeenCalledWith(unconfirmed);
  });
});
