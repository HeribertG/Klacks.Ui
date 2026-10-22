// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SEED_ADMIN_USER_ID } from 'src/app/domain/constants/setup.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { OwnAdminSetupStatusService } from './own-admin-setup-status.service';

describe('OwnAdminSetupStatusService', () => {
  let service: OwnAdminSetupStatusService;
  let getStatus: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getStatus = vi.fn();
    get = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        OwnAdminSetupStatusService,
        { provide: DataSetupService, useValue: { getStatus } },
        { provide: LocalStorageService, useValue: { get } },
      ],
    });
    service = TestBed.inject(OwnAdminSetupStatusService);
  });

  it('never reads the status for another user', async () => {
    get.mockReturnValue('another-user');

    await expect(service.isOwnAdminSetupRequired()).resolves.toBe(false);
    expect(getStatus).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith(StorageKeys.TOKEN_USERID);
  });

  it('follows the status flag for the seeded admin', async () => {
    get.mockReturnValue(SEED_ADMIN_USER_ID);

    getStatus.mockReturnValue(of({ requiresOwnAdmin: true }));
    await expect(service.isOwnAdminSetupRequired()).resolves.toBe(true);

    getStatus.mockReturnValue(of({ requiresOwnAdmin: false }));
    await expect(service.isOwnAdminSetupRequired()).resolves.toBe(false);
  });

  it('treats a failed or empty status read as not required', async () => {
    get.mockReturnValue(SEED_ADMIN_USER_ID);

    getStatus.mockReturnValue(throwError(() => new Error('boom')));
    await expect(service.isOwnAdminSetupRequired()).resolves.toBe(false);

    getStatus.mockReturnValue(of(null));
    await expect(service.isOwnAdminSetupRequired()).resolves.toBe(false);
  });
});
