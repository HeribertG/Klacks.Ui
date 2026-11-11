// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ClientSortPreferenceService } from './client-sort-preference.service';
import { ClientSortPreferenceApiService } from 'src/app/infrastructure/api/schedule/client-sort-preference-api.service';

describe('ClientSortPreferenceService', () => {
  const GROUP_ID = 'group-1';
  let getSortOrder: Mock;
  let service: ClientSortPreferenceService;

  beforeEach(() => {
    getSortOrder = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ClientSortPreferenceService,
        { provide: ClientSortPreferenceApiService, useValue: { getSortOrder, saveSortOrder: vi.fn() } },
      ],
    });
    service = TestBed.inject(ClientSortPreferenceService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('ranks nobody when the group has no saved order', async () => {
    // Arrange
    getSortOrder.mockResolvedValue([]);

    // Act
    await service.loadForGroup(GROUP_ID);

    // Assert
    expect(service.ranksAny(['client-1'])).toBe(false);
  });

  it('ranks the given clients when the saved order names one of them', async () => {
    // Arrange
    getSortOrder.mockResolvedValue([{ clientId: 'client-1', sortOrder: 0 }]);

    // Act
    await service.loadForGroup(GROUP_ID);

    // Assert
    expect(service.ranksAny(['client-2', 'client-1'])).toBe(true);
  });

  it('ranks nobody when the saved order names only other clients', async () => {
    // Arrange
    getSortOrder.mockResolvedValue([{ clientId: 'client-1', sortOrder: 0 }]);

    // Act
    await service.loadForGroup(GROUP_ID);

    // Assert
    expect(service.ranksAny(['client-2'])).toBe(false);
  });

  it('ranks nobody when loading the order failed', async () => {
    // Arrange
    getSortOrder.mockRejectedValue(new Error('offline'));

    // Act
    await service.loadForGroup(GROUP_ID);

    // Assert
    expect(service.ranksAny(['client-1'])).toBe(false);
  });

  it('replaces the previous order when another group is loaded with an empty order', async () => {
    // Arrange
    getSortOrder.mockResolvedValueOnce([{ clientId: 'client-1', sortOrder: 0 }]).mockResolvedValueOnce([]);
    await service.loadForGroup(GROUP_ID);

    // Act
    await service.loadForGroup('group-2');

    // Assert
    expect(service.ranksAny(['client-1'])).toBe(false);
  });
});
