// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { DataManagementIdentityProviderService } from './data-management-identity-provider.service';
import { UserAdministrationManagementService } from './user-administration-management.service';
import { DataIdentityProviderService } from 'src/app/infrastructure/api/settings/data-identity-provider.service';
import { IDirectoryAccount } from 'src/app/domain/models/settings/directory-account.interface';
import { IDirectoryAccountList } from 'src/app/domain/models/settings/directory-account-list.interface';

const PROVIDER_ID = 'provider-1';

function account(externalId: string, overrides: Partial<IDirectoryAccount> = {}): IDirectoryAccount {
  return {
    externalId,
    displayName: `Name ${externalId}`,
    loginName: externalId,
    email: `${externalId}@example.com`,
    mayLogin: false,
    userId: null,
    emailInUse: false,
    hasRoles: false,
    isInDirectory: true,
    ...overrides,
  };
}

function list(accounts: IDirectoryAccount[], overrides: Partial<IDirectoryAccountList> = {}): IDirectoryAccountList {
  return { success: true, isTruncated: false, accounts, ...overrides };
}

describe('DataManagementIdentityProviderService (directory accounts)', () => {
  let service: DataManagementIdentityProviderService;
  let dataService: {
    getDirectoryAccounts: ReturnType<typeof vi.fn>;
    setDirectoryAccountAccess: ReturnType<typeof vi.fn>;
  };
  let userAdministration: { loadAccounts: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dataService = { getDirectoryAccounts: vi.fn(), setDirectoryAccountAccess: vi.fn() };
    userAdministration = { loadAccounts: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        DataManagementIdentityProviderService,
        { provide: DataIdentityProviderService, useValue: dataService },
        { provide: UserAdministrationManagementService, useValue: userAdministration },
      ],
    });
    service = TestBed.inject(DataManagementIdentityProviderService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads the rows and the truncated flag', () => {
    dataService.getDirectoryAccounts.mockReturnValue(of(list([account('a')], { isTruncated: true })));

    service.loadDirectoryAccounts(PROVIDER_ID, 'ann');

    expect(dataService.getDirectoryAccounts).toHaveBeenCalledWith(PROVIDER_ID, 'ann');
    expect(service.directoryAccounts().map((row) => row.externalId)).toEqual(['a']);
    expect(service.accountsTruncated()).toBe(true);
    expect(service.accountsLoadFailed()).toBe(false);
    expect(service.isLoadingAccounts()).toBe(false);
  });

  it('drops a stale answer when a newer search was started', () => {
    const older = new Subject<IDirectoryAccountList>();
    const newer = new Subject<IDirectoryAccountList>();
    dataService.getDirectoryAccounts.mockReturnValueOnce(older).mockReturnValueOnce(newer);

    service.loadDirectoryAccounts(PROVIDER_ID, 'a');
    service.loadDirectoryAccounts(PROVIDER_ID, 'ab');
    newer.next(list([account('new')]));
    older.next(list([account('old')]));

    expect(service.directoryAccounts().map((row) => row.externalId)).toEqual(['new']);
  });

  it('marks the load as failed when the directory is unavailable', () => {
    dataService.getDirectoryAccounts.mockReturnValue(of(list([], { success: false })));

    service.loadDirectoryAccounts(PROVIDER_ID, '');

    expect(service.accountsLoadFailed()).toBe(true);
    expect(service.directoryAccounts()).toEqual([]);
  });

  it('marks the load as failed on an HTTP error and keeps the stream alive', () => {
    dataService.getDirectoryAccounts
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: HttpStatusCode.InternalServerError })))
      .mockReturnValueOnce(of(list([account('a')])));

    service.loadDirectoryAccounts(PROVIDER_ID, '');
    expect(service.accountsLoadFailed()).toBe(true);
    expect(service.isLoadingAccounts()).toBe(false);

    service.loadDirectoryAccounts(PROVIDER_ID, '');
    expect(service.accountsLoadFailed()).toBe(false);
    expect(service.directoryAccounts().length).toBe(1);
  });

  it('ignores an answer that arrives after the list was cleared', () => {
    const pending = new Subject<IDirectoryAccountList>();
    dataService.getDirectoryAccounts.mockReturnValue(pending);

    service.loadDirectoryAccounts(PROVIDER_ID, '');
    service.clearDirectoryAccounts();
    pending.next(list([account('late')]));

    expect(service.directoryAccounts()).toEqual([]);
    expect(service.isLoadingAccounts()).toBe(false);
  });

  it('replaces the changed row and reloads the user list after an approval', async () => {
    dataService.getDirectoryAccounts.mockReturnValue(of(list([account('a'), account('b')])));
    service.loadDirectoryAccounts(PROVIDER_ID, '');
    const approved = account('b', { mayLogin: true, userId: 'user-b' });
    dataService.setDirectoryAccountAccess.mockReturnValue(of(approved));

    const outcome = await service.setDirectoryAccountAccess(PROVIDER_ID, 'b', true);

    expect(dataService.setDirectoryAccountAccess).toHaveBeenCalledWith(PROVIDER_ID, 'b', true);
    expect(outcome).toEqual({ account: approved, errorCode: null });
    expect(service.directoryAccounts()[1]).toEqual(approved);
    expect(service.directoryAccounts()[0].mayLogin).toBe(false);
    expect(userAdministration.loadAccounts).toHaveBeenCalledTimes(1);
  });

  it('returns the refusal code and leaves the rows and the user list alone when refused', async () => {
    dataService.getDirectoryAccounts.mockReturnValue(of(list([account('a')])));
    service.loadDirectoryAccounts(PROVIDER_ID, '');
    dataService.setDirectoryAccountAccess.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: HttpStatusCode.BadRequest,
            error: { errorCode: 'directoryAccountWithoutEmail' },
          })
      )
    );

    const outcome = await service.setDirectoryAccountAccess(PROVIDER_ID, 'a', true);

    expect(outcome).toEqual({ account: null, errorCode: 'directoryAccountWithoutEmail' });
    expect(service.directoryAccounts()[0].mayLogin).toBe(false);
    expect(userAdministration.loadAccounts).not.toHaveBeenCalled();
  });
});
