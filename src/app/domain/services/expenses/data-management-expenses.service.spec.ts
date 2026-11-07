// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataManagementExpensesService } from './data-management-expenses.service';
import { DataExpensesService } from 'src/app/infrastructure/api/expenses/data-expenses.service';
import { AnalyseScenarioService } from '../schedule/analyse-scenario.service';
import { ExpensesRequest } from 'src/app/domain/models/expenses/expenses';
import { ExpensesResource } from 'src/app/domain/models/expenses/expenses-resource.interface';

describe('DataManagementExpensesService', () => {
  let service: DataManagementExpensesService;
  let api: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { create: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DataExpensesService, useValue: api },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => null } },
      ],
    });
    service = TestBed.inject(DataManagementExpensesService);
  });

  it('hands back the created expenses and clears isCreating', () => {
    const created = { id: 'expenses-1' } as ExpensesResource;
    api.create.mockReturnValue(of(created));
    const next = vi.fn();

    service.create({} as ExpensesRequest).subscribe(next);

    expect(next).toHaveBeenCalledWith(created);
    expect(service.lastCreated()).toBe(created);
    expect(service.isCreating()).toBe(false);
  });

  it('completes without a value and clears isCreating when an identical create is still in flight', () => {
    api.create.mockReturnValue(EMPTY);
    const next = vi.fn();
    const complete = vi.fn();

    service.create({} as ExpensesRequest).subscribe({ next, complete });

    expect(next).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(service.isCreating()).toBe(false);
  });
});
