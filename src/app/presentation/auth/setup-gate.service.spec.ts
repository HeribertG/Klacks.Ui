// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SetupGateService } from './setup-gate.service';
import { SEED_ADMIN_USER_ID } from 'src/app/domain/constants/setup.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

describe('SetupGateService', () => {
  let service: SetupGateService;
  let dataSetupService: any;
  let localStorageService: any;
  let navigationService: any;

  beforeEach(() => {
    const dataSetupServiceSpy = { getStatus: vi.fn() };
    const localStorageServiceSpy = { get: vi.fn() };
    const navigationServiceSpy = { navigateToSetup: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataSetupService, useValue: dataSetupServiceSpy },
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
      ],
    });

    service = TestBed.inject(SetupGateService);
    dataSetupService = TestBed.inject(DataSetupService) as any;
    localStorageService = TestBed.inject(LocalStorageService) as any;
    navigationService = TestBed.inject(NavigationService) as any;
  });

  it('should not call the backend for a non-seed-admin user', async () => {
    localStorageService.get.mockReturnValue('some-other-user-id');

    const redirected = await service.checkAndRedirect();

    expect(dataSetupService.getStatus).not.toHaveBeenCalled();
    expect(redirected).toBe(false);
  });

  it('should redirect to setup when the gate is active for the seed admin', async () => {
    localStorageService.get.mockImplementation((key: string) =>
      key === StorageKeys.TOKEN_USERID ? SEED_ADMIN_USER_ID : null
    );
    dataSetupService.getStatus.mockReturnValue(of({ requiresOwnAdmin: true }));

    const redirected = await service.checkAndRedirect();

    expect(navigationService.navigateToSetup).toHaveBeenCalled();
    expect(redirected).toBe(true);
  });

  it('should not redirect when the gate is no longer active', async () => {
    localStorageService.get.mockReturnValue(SEED_ADMIN_USER_ID);
    dataSetupService.getStatus.mockReturnValue(of({ requiresOwnAdmin: false }));

    const redirected = await service.checkAndRedirect();

    expect(navigationService.navigateToSetup).not.toHaveBeenCalled();
    expect(redirected).toBe(false);
  });

  it('should fail safe (no redirect) when the status check errors', async () => {
    localStorageService.get.mockReturnValue(SEED_ADMIN_USER_ID);
    dataSetupService.getStatus.mockReturnValue(throwError(() => new Error('boom')));

    const redirected = await service.checkAndRedirect();

    expect(navigationService.navigateToSetup).not.toHaveBeenCalled();
    expect(redirected).toBe(false);
  });
});
