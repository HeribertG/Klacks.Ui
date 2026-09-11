// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { CompanyClockService } from './company-clock.service';
import { DataCompanyClockService } from 'src/app/infrastructure/api/settings/data-company-clock.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { companyTimeZone, setCompanyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { ICompanyClockResource } from 'src/app/domain/models/settings/company-clock.model';

describe('CompanyClockService', () => {
  let service: CompanyClockService;
  let mockDataCompanyClockService: { readCompanyClock: ReturnType<typeof vi.fn> };
  let mockLocalStorageService: { get: ReturnType<typeof vi.fn> };
  let warnSpy: ReturnType<typeof vi.spyOn>;

  const CLOCK: ICompanyClockResource = { timeZone: 'Asia/Kolkata', today: '2026-06-28', source: 'Setting' };

  beforeEach(() => {
    mockDataCompanyClockService = { readCompanyClock: vi.fn().mockReturnValue(of(CLOCK)) };
    mockLocalStorageService = { get: vi.fn().mockReturnValue(null) };
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        CompanyClockService,
        { provide: DataCompanyClockService, useValue: mockDataCompanyClockService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
      ],
    });

    service = TestBed.inject(CompanyClockService);
  });

  afterEach(() => {
    setCompanyTimeZone(null);
    warnSpy.mockRestore();
  });

  it('does not call the endpoint when no token is present', async () => {
    await service.loadIfAuthenticated();

    expect(mockDataCompanyClockService.readCompanyClock).not.toHaveBeenCalled();
    expect(companyTimeZone()).toBeNull();
    expect(service.source()).toBeNull();
  });

  it('loads the company time zone and source when a token is present', async () => {
    mockLocalStorageService.get.mockReturnValue('a-token');

    await service.loadIfAuthenticated();

    expect(mockDataCompanyClockService.readCompanyClock).toHaveBeenCalledTimes(1);
    expect(companyTimeZone()).toBe('Asia/Kolkata');
    expect(service.source()).toBe('Setting');
  });

  it('only fetches once across repeated loadIfAuthenticated calls', async () => {
    mockLocalStorageService.get.mockReturnValue('a-token');

    await service.loadIfAuthenticated();
    await service.loadIfAuthenticated();

    expect(mockDataCompanyClockService.readCompanyClock).toHaveBeenCalledTimes(1);
  });

  it('reload always re-fetches, bypassing the once-only guard', async () => {
    mockLocalStorageService.get.mockReturnValue(StorageKeys.TOKEN && 'a-token');

    await service.loadIfAuthenticated();
    await service.reload();

    expect(mockDataCompanyClockService.readCompanyClock).toHaveBeenCalledTimes(2);
  });

  it('keeps the browser time zone and only warns on a failed load', async () => {
    mockLocalStorageService.get.mockReturnValue('a-token');
    mockDataCompanyClockService.readCompanyClock.mockReturnValue(throwError(() => new Error('network down')));

    await service.loadIfAuthenticated();

    expect(companyTimeZone()).toBeNull();
    expect(service.source()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('retries on the next loadIfAuthenticated call after a failed load', async () => {
    mockLocalStorageService.get.mockReturnValue('a-token');
    mockDataCompanyClockService.readCompanyClock.mockReturnValueOnce(throwError(() => new Error('network down')));

    await service.loadIfAuthenticated();
    await service.loadIfAuthenticated();

    expect(mockDataCompanyClockService.readCompanyClock).toHaveBeenCalledTimes(2);
    expect(companyTimeZone()).toBe('Asia/Kolkata');
    expect(service.source()).toBe('Setting');
  });

  it('reset clears zone and source and lets the next loadIfAuthenticated fetch again', async () => {
    mockLocalStorageService.get.mockReturnValue('a-token');
    await service.loadIfAuthenticated();

    service.reset();

    expect(companyTimeZone()).toBeNull();
    expect(service.source()).toBeNull();

    await service.loadIfAuthenticated();
    expect(mockDataCompanyClockService.readCompanyClock).toHaveBeenCalledTimes(2);
    expect(companyTimeZone()).toBe('Asia/Kolkata');
  });

  it('discards a response that arrives after reset', async () => {
    mockLocalStorageService.get.mockReturnValue('a-token');
    const pending = new Subject<ICompanyClockResource>();
    mockDataCompanyClockService.readCompanyClock.mockReturnValue(pending.asObservable());

    const load = service.loadIfAuthenticated();
    service.reset();
    pending.next(CLOCK);
    pending.complete();
    await load;

    expect(companyTimeZone()).toBeNull();
    expect(service.source()).toBeNull();
  });
});
