// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DataManagementBreakService } from './data-management-break.service';
import { DataBreakService } from 'src/app/infrastructure/api/break/data-break.service';
import { AnalyseScenarioService } from '../schedule/analyse-scenario.service';
import { IBreak } from 'src/app/domain/models/break/break.interface';

describe('DataManagementBreakService', () => {
  let service: DataManagementBreakService;
  let api: { confirmBreak: ReturnType<typeof vi.fn>; unconfirmBreak: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { confirmBreak: vi.fn(), unconfirmBreak: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DataBreakService, useValue: api },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => null } },
      ],
    });
    service = TestBed.inject(DataManagementBreakService);
  });

  it('confirms a break through the API and hands back its response', () => {
    const confirmed = { id: 'break-1' } as IBreak;
    api.confirmBreak.mockReturnValue(of(confirmed));
    const next = vi.fn();

    service.confirmBreak('break-1').subscribe(next);

    expect(api.confirmBreak).toHaveBeenCalledWith('break-1');
    expect(next).toHaveBeenCalledWith(confirmed);
  });

  it('unconfirms a break through the API and hands back its response', () => {
    const unconfirmed = { id: 'break-1' } as IBreak;
    api.unconfirmBreak.mockReturnValue(of(unconfirmed));
    const next = vi.fn();

    service.unconfirmBreak('break-1').subscribe(next);

    expect(api.unconfirmBreak).toHaveBeenCalledWith('break-1');
    expect(next).toHaveBeenCalledWith(unconfirmed);
  });
});
