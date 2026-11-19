// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { IdentityProviderAccountsComponent } from './identity-provider-accounts.component';
import { DataManagementIdentityProviderService } from 'src/app/domain/services/settings/data-management-identity-provider.service';
import { UserAdministrationManagementService } from 'src/app/domain/services/settings/user-administration-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IDirectoryAccount } from 'src/app/domain/models/settings/directory-account.interface';
import { IDirectoryAccountAccessOutcome } from 'src/app/domain/models/settings/directory-account-access-outcome.interface';
import {
  DIRECTORY_ACCOUNTS_SEARCH_DEBOUNCE_MS,
  DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY,
  DIRECTORY_ACCOUNT_ERROR_KEYS,
} from 'src/app/domain/constants/identity-provider.constants';

const PROVIDER_ID = 'provider-1';
const OWN_USER_ID = 'own-user';

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

describe('IdentityProviderAccountsComponent', () => {
  let fixture: ComponentFixture<IdentityProviderAccountsComponent>;
  let providerService: {
    directoryAccounts: ReturnType<typeof signal<IDirectoryAccount[]>>;
    isLoadingAccounts: ReturnType<typeof signal<boolean>>;
    accountsTruncated: ReturnType<typeof signal<boolean>>;
    accountsLoadFailed: ReturnType<typeof signal<boolean>>;
    loadDirectoryAccounts: ReturnType<typeof vi.fn>;
    clearDirectoryAccounts: ReturnType<typeof vi.fn>;
    setDirectoryAccountAccess: ReturnType<typeof vi.fn>;
  };
  let toast: { showError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    providerService = {
      directoryAccounts: signal<IDirectoryAccount[]>([]),
      isLoadingAccounts: signal(false),
      accountsTruncated: signal(false),
      accountsLoadFailed: signal(false),
      loadDirectoryAccounts: vi.fn(),
      clearDirectoryAccounts: vi.fn(),
      setDirectoryAccountAccess: vi.fn(),
    };
    toast = { showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [IdentityProviderAccountsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementIdentityProviderService, useValue: providerService },
        { provide: UserAdministrationManagementService, useValue: { currentAccountId: signal(OWN_USER_ID) } },
        { provide: ToastShowService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IdentityProviderAccountsComponent);
    fixture.componentRef.setInput('providerId', PROVIDER_ID);
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const checkbox = (index: number): HTMLInputElement =>
    element().querySelector(`#identity-provider-accounts-may-login-${index}`) as HTMLInputElement;

  function render(accounts: IDirectoryAccount[]): void {
    providerService.directoryAccounts.set(accounts);
    fixture.detectChanges();
  }

  it('clears the previous provider and loads the full list on start', () => {
    expect(providerService.clearDirectoryAccounts).toHaveBeenCalled();
    expect(providerService.loadDirectoryAccounts).toHaveBeenCalledWith(PROVIDER_ID, '');
  });

  it('renders one row per account with name, login name and e-mail', () => {
    render([account('a', { mayLogin: true }), account('b')]);

    expect(element().querySelectorAll('tbody tr').length).toBe(2);
    expect(element().textContent).toContain('Name a');
    expect(element().textContent).toContain('b@example.com');
    expect(checkbox(0).checked).toBe(true);
    expect(checkbox(1).checked).toBe(false);
  });

  it('shows the empty, truncated and load-failed notices inside a status region', () => {
    expect(element().querySelector('#identity-provider-accounts-empty')).not.toBeNull();

    providerService.accountsTruncated.set(true);
    providerService.accountsLoadFailed.set(true);
    fixture.detectChanges();

    const status = element().querySelector('[role="status"]') as HTMLElement;
    expect(status.querySelector('#identity-provider-accounts-truncated')).not.toBeNull();
    expect(status.querySelector('#identity-provider-accounts-load-failed')).not.toBeNull();
    expect(element().querySelector('#identity-provider-accounts-empty')).toBeNull();
  });

  it('searches only once after typing stops', () => {
    vi.useFakeTimers();
    providerService.loadDirectoryAccounts.mockClear();
    const search = element().querySelector('#identity-provider-accounts-search') as HTMLInputElement;

    for (const value of ['a', 'an', 'ann']) {
      search.value = value;
      search.dispatchEvent(new Event('input'));
    }
    vi.advanceTimersByTime(DIRECTORY_ACCOUNTS_SEARCH_DEBOUNCE_MS - 1);
    expect(providerService.loadDirectoryAccounts).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(providerService.loadDirectoryAccounts).toHaveBeenCalledTimes(1);
    expect(providerService.loadDirectoryAccounts).toHaveBeenCalledWith(PROVIDER_ID, 'ann');
  });

  it('searches the same term again after the provider changed', () => {
    vi.useFakeTimers();
    const search = element().querySelector('#identity-provider-accounts-search') as HTMLInputElement;
    const type = (value: string): void => {
      search.value = value;
      search.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(DIRECTORY_ACCOUNTS_SEARCH_DEBOUNCE_MS);
    };

    type('ann');
    fixture.componentRef.setInput('providerId', 'provider-2');
    fixture.detectChanges();
    providerService.loadDirectoryAccounts.mockClear();
    type('ann');

    expect(providerService.loadDirectoryAccounts).toHaveBeenCalledWith('provider-2', 'ann');
  });

  it('disables the own account, unlinked accounts without e-mail and vanished accounts that are not approved', () => {
    render([
      account('own', { userId: OWN_USER_ID, mayLogin: true }),
      account('no-mail', { email: null }),
      account('gone', { isInDirectory: false, userId: 'u', mayLogin: false }),
      account('linked-no-mail', { email: null, userId: 'u2', mayLogin: true }),
      account('free'),
    ]);

    expect(checkbox(0).disabled).toBe(true);
    expect(checkbox(1).disabled).toBe(true);
    expect(checkbox(2).disabled).toBe(true);
    expect(checkbox(3).disabled).toBe(false);
    expect(checkbox(4).disabled).toBe(false);
  });

  it('blocks an unticked account whose e-mail another Klacks account uses and says why', () => {
    render([account('a', { emailInUse: true }), account('b', { emailInUse: true, mayLogin: true, userId: 'u' })]);

    expect(checkbox(0).disabled).toBe(true);
    expect(checkbox(1).disabled).toBe(false);
    expect(element().querySelectorAll('tbody tr')[0].textContent).toContain(
      'settings.identity-provider.accounts.hint.email-in-use'
    );
    expect(element().querySelectorAll('tbody tr')[1].textContent).not.toContain(
      'settings.identity-provider.accounts.hint.email-in-use'
    );
  });

  it('blocks re-ticking a deactivated linked account that still has roles and says why', () => {
    render([
      account('roles', { userId: 'u1', mayLogin: false, hasRoles: true }),
      account('plain', { userId: 'u2', mayLogin: false, hasRoles: false }),
      account('active', { userId: 'u3', mayLogin: true, hasRoles: true }),
    ]);

    expect(checkbox(0).disabled).toBe(true);
    expect(checkbox(1).disabled).toBe(false);
    expect(checkbox(2).disabled).toBe(false);
    expect(element().querySelectorAll('tbody tr')[0].textContent).toContain(
      'settings.identity-provider.accounts.hint.has-roles'
    );
    expect(element().textContent?.match(/hint\.has-roles/g)?.length).toBe(1);
  });

  it('sends the new state of a ticked box', async () => {
    render([account('a')]);
    const outcome: IDirectoryAccountAccessOutcome = { account: account('a', { mayLogin: true }), errorCode: null };
    providerService.setDirectoryAccountAccess.mockResolvedValue(outcome);

    checkbox(0).click();
    await fixture.whenStable();

    expect(providerService.setDirectoryAccountAccess).toHaveBeenCalledWith(PROVIDER_ID, 'a', true);
    expect(toast.showError).not.toHaveBeenCalled();
  });

  it('resets the box and toasts the coded refusal when the change is refused', async () => {
    render([account('a')]);
    providerService.setDirectoryAccountAccess.mockResolvedValue({
      account: null,
      errorCode: 'directoryAccountEmailTaken',
    } satisfies IDirectoryAccountAccessOutcome);

    checkbox(0).click();
    await fixture.whenStable();

    expect(checkbox(0).checked).toBe(false);
    const key = DIRECTORY_ACCOUNT_ERROR_KEYS['directoryAccountEmailTaken'];
    expect(toast.showError).toHaveBeenCalledWith(key, key);
  });

  it('toasts the generic text for a failure without a known code', async () => {
    render([account('a', { mayLogin: true, userId: 'u' })]);
    providerService.setDirectoryAccountAccess.mockResolvedValue({ account: null, errorCode: null });

    checkbox(0).click();
    await fixture.whenStable();

    expect(checkbox(0).checked).toBe(true);
    expect(toast.showError).toHaveBeenCalledWith(DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY, DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY);
  });

  it('clears the list when destroyed', () => {
    providerService.clearDirectoryAccounts.mockClear();

    fixture.destroy();

    expect(providerService.clearDirectoryAccounts).toHaveBeenCalledTimes(1);
  });
});
