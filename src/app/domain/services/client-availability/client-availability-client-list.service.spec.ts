// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IClientAvailabilityClientFilter } from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';
import { IClientAvailabilityClientResource } from 'src/app/domain/models/client-availability/client-availability-client-resource.interface';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';
import { ClientSortPreferenceService } from '../schedule/client-sort-preference.service';
import { ClientAvailabilityClientListService } from './client-availability-client-list.service';

describe('ClientAvailabilityClientListService', () => {
  let service: ClientAvailabilityClientListService;
  let api: { getClients: ReturnType<typeof vi.fn> };
  let sortPreference: { applyTo: ReturnType<typeof vi.fn> };

  const client = (id: string): IClientAvailabilityClientResource => ({
    id,
    name: id,
    firstName: '',
    company: '',
    legalEntity: false,
    idNumber: 0,
    groupIds: [],
  });

  const filter = (individualSort: boolean): IClientAvailabilityClientFilter => ({
    searchString: '',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    orderBy: 'name',
    sortOrder: 'asc',
    showEmployees: true,
    showExtern: true,
    individualSort,
    startRow: 0,
    rowCount: 200,
  });

  beforeEach(() => {
    api = { getClients: vi.fn() };
    sortPreference = { applyTo: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DataClientAvailabilityService, useValue: api },
        { provide: ClientSortPreferenceService, useValue: sortPreference },
      ],
    });
    service = TestBed.inject(ClientAvailabilityClientListService);
  });

  it('returns the clients in server order when the individual sort is off', async () => {
    const clients = [client('b'), client('a')];
    api.getClients.mockReturnValue(of({ clients, totalCount: 2 }));
    const requested = filter(false);

    const result = await service.loadClients(requested);

    expect(api.getClients).toHaveBeenCalledWith(requested);
    expect(sortPreference.applyTo).not.toHaveBeenCalled();
    expect(result).toEqual(clients);
  });

  it('orders the clients by the sort preference when the individual sort is on', async () => {
    const clients = [client('b'), client('a')];
    const ordered = [client('a'), client('b')];
    api.getClients.mockReturnValue(of({ clients, totalCount: 2 }));
    sortPreference.applyTo.mockReturnValue(ordered);

    const result = await service.loadClients(filter(true));

    expect(sortPreference.applyTo).toHaveBeenCalledWith(clients);
    expect(result).toBe(ordered);
  });

  it('propagates a failed read', async () => {
    const failure = new Error('boom');
    api.getClients.mockReturnValue(throwError(() => failure));

    await expect(service.loadClients(filter(true))).rejects.toBe(failure);
    expect(sortPreference.applyTo).not.toHaveBeenCalled();
  });
});
