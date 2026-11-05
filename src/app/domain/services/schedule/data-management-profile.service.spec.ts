// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataManagementProfileService } from './data-management-profile.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { IPasswordChangeResult } from 'src/app/domain/models/auth/password-change-result.interface';
import { UserAdministrationService } from 'src/app/infrastructure/api/settings/user-administration.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

describe('DataManagementProfileService', () => {
  const OLD_TOKEN = 'old-access';
  const OLD_REFRESH = 'old-refresh';
  const OLD_EXPIRY = '2026-11-04T10:00:00Z';

  let service: DataManagementProfileService;
  let storage: Map<string, string>;
  let changePassword: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = new Map<string, string>([
      [StorageKeys.TOKEN, OLD_TOKEN],
      [StorageKeys.TOKEN_REFRESHTOKEN, OLD_REFRESH],
      [StorageKeys.TOKEN_EXP, OLD_EXPIRY],
    ]);
    changePassword = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        DataManagementProfileService,
        { provide: UserAdministrationService, useValue: { changePassword } },
        {
          provide: LocalStorageService,
          useValue: {
            get: (key: string) => storage.get(key) ?? null,
            set: (key: string, value: string) => storage.set(key, value),
            remove: (key: string) => storage.delete(key),
          },
        },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() } },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: { register: vi.fn() } },
      ],
    });

    service = TestBed.inject(DataManagementProfileService);
    service.passwordChangeIsAllowed(true);
  });

  it('stores the fresh access token and drops the revoked legacy refresh token after a password change', () => {
    const result: IPasswordChangeResult = {
      success: true,
      mailSuccess: true,
      token: 'new-access',
      expires: '2026-11-04T10:15:00Z',
    };
    changePassword.mockReturnValue(of(result));

    service.save();

    expect(changePassword).toHaveBeenCalledTimes(1);
    expect(storage.get(StorageKeys.TOKEN)).toBe('new-access');
    expect(storage.has(StorageKeys.TOKEN_REFRESHTOKEN)).toBe(false);
    expect(storage.get(StorageKeys.TOKEN_EXP)).toBe('2026-11-04T10:15:00Z');
  });

  it('keeps the stored session when the response carries no access token', () => {
    const result: IPasswordChangeResult = {
      success: true,
      mailSuccess: true,
      token: '',
      expires: '',
    };
    changePassword.mockReturnValue(of(result));

    service.save();

    expect(storage.get(StorageKeys.TOKEN)).toBe(OLD_TOKEN);
    expect(storage.get(StorageKeys.TOKEN_REFRESHTOKEN)).toBe(OLD_REFRESH);
    expect(storage.get(StorageKeys.TOKEN_EXP)).toBe(OLD_EXPIRY);
  });
});
