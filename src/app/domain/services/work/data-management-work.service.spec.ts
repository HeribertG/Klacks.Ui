// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DataManagementWorkService } from './data-management-work.service';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { AnalyseScenarioService } from '../schedule/analyse-scenario.service';
import { IWork } from 'src/app/domain/models/schedule/work.interface';
import { Work } from 'src/app/domain/models/schedule/schedule-class';

describe('DataManagementWorkService', () => {
  let service: DataManagementWorkService;
  let api: {
    addWork: ReturnType<typeof vi.fn>;
    updateWork: ReturnType<typeof vi.fn>;
    confirmWork: ReturnType<typeof vi.fn>;
    unconfirmWork: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = { addWork: vi.fn(), updateWork: vi.fn(), confirmWork: vi.fn(), unconfirmWork: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DataScheduleService, useValue: api },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => 'scenario-token' } },
      ],
    });
    service = TestBed.inject(DataManagementWorkService);
  });

  it('adds and updates a work entry exactly as the caller built it, without stamping the active scenario token', () => {
    const added = { id: 'work-new' } as IWork;
    const updated = { id: 'work-1' } as IWork;
    api.addWork.mockReturnValue(of(added));
    api.updateWork.mockReturnValue(of(updated));
    const newWork = new Work();
    const editedWork = new Work();
    editedWork.id = 'work-1';
    const next = vi.fn();

    service.addWorkEntry(newWork).subscribe(next);
    service.updateWorkEntry(editedWork).subscribe(next);

    expect(api.addWork).toHaveBeenCalledWith(newWork);
    expect(api.updateWork).toHaveBeenCalledWith(editedWork);
    expect(newWork.analyseToken).toBeUndefined();
    expect(editedWork.analyseToken).toBeUndefined();
    expect(next.mock.calls).toEqual([[added], [updated]]);
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
