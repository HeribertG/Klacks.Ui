// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ClientSearchService } from './client-search.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { IClientForReplacement } from 'src/app/domain/models/client/client-for-replacement.interface';

describe('ClientSearchService', () => {
  let service: ClientSearchService;
  let getClientsForReplacement: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getClientsForReplacement = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DataClientService, useValue: { getClientsForReplacement } }],
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
});
