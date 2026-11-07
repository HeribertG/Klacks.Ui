// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataManagementWorkchangeService } from './data-management-workchange.service';
import { DataWorkChangeService } from 'src/app/infrastructure/api/workchange/data-work-change.service';
import { WorkChangeRequest } from 'src/app/domain/models/workchange/work-change';
import { WorkChangeResource } from 'src/app/domain/models/workchange/work-change-resource.interface';

describe('DataManagementWorkchangeService', () => {
  let service: DataManagementWorkchangeService;
  let api: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { create: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: DataWorkChangeService, useValue: api }],
    });
    service = TestBed.inject(DataManagementWorkchangeService);
  });

  it('hands back the created work change and clears isCreating', () => {
    const created = { id: 'change-1' } as WorkChangeResource;
    api.create.mockReturnValue(of(created));
    const next = vi.fn();

    service.create({} as WorkChangeRequest).subscribe(next);

    expect(next).toHaveBeenCalledWith(created);
    expect(service.lastCreated()).toBe(created);
    expect(service.isCreating()).toBe(false);
  });

  it('completes without a value and clears isCreating when an identical create is still in flight', () => {
    api.create.mockReturnValue(EMPTY);
    const next = vi.fn();
    const complete = vi.fn();

    service.create({} as WorkChangeRequest).subscribe({ next, complete });

    expect(next).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(service.isCreating()).toBe(false);
  });
});
