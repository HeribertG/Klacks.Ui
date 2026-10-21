// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ClientSearchService } from './client-search.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { IClientForReplacement } from 'src/app/domain/models/client/client-for-replacement.interface';

describe('ClientSearchService', () => {
  let service: ClientSearchService;
  let getClientsForReplacement: ReturnType<typeof vi.fn>;
  let getClient: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getClientsForReplacement = vi.fn();
    getClient = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DataClientService, useValue: { getClientsForReplacement, getClient } }],
    });
    service = TestBed.inject(ClientSearchService);
  });

  it('reads the replacement candidates from the API', () => {
    const clients = [{ id: 'client-1' }] as unknown as IClientForReplacement[];
    getClientsForReplacement.mockReturnValue(of(clients));
    const next = vi.fn();

    service.getClientsForReplacement().subscribe(next);

    expect(getClientsForReplacement).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(clients);
  });

  describe('idNumberSearchStringFor', () => {
    it('returns the id number of the client as search text', async () => {
      getClient.mockReturnValue(of({ idNumber: 1148 }));

      await expect(service.idNumberSearchStringFor('client-1')).resolves.toBe('1148');
      expect(getClient).toHaveBeenCalledWith('client-1');
    });

    it('returns an empty string for a client without id number', async () => {
      getClient.mockReturnValue(of({ idNumber: 0 }));

      await expect(service.idNumberSearchStringFor('client-1')).resolves.toBe('');
    });

    it('rejects when the client cannot be read', async () => {
      getClient.mockReturnValue(throwError(() => new Error('403')));

      await expect(service.idNumberSearchStringFor('client-1')).rejects.toThrow('403');
    });
  });
});
