// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Approval list of a directory provider (LDAP/AD): the administrator ticks which directory accounts may sign in to
 * Klacks. Ticking creates or links a Klacks account, un-ticking deactivates it. The search runs on the server, debounced.
 * @param providerId - Persisted id of the provider whose accounts are listed
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import { DataManagementIdentityProviderService } from 'src/app/domain/services/settings/data-management-identity-provider.service';
import { UserAdministrationManagementService } from 'src/app/domain/services/settings/user-administration-management.service';
import { IDirectoryAccount } from 'src/app/domain/models/settings/directory-account.interface';
import { IDirectoryAccountsRequest } from 'src/app/domain/models/settings/directory-accounts-request.interface';
import {
  DIRECTORY_ACCOUNTS_SEARCH_DEBOUNCE_MS,
  DIRECTORY_ACCOUNTS_SEARCH_MAX_LENGTH,
  DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY,
  DIRECTORY_ACCOUNT_ERROR_KEYS,
} from 'src/app/domain/constants/identity-provider.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

@Component({
  selector: 'app-identity-provider-accounts',
  templateUrl: './identity-provider-accounts.component.html',
  styleUrls: ['./identity-provider-accounts.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityProviderAccountsComponent {
  readonly providerId = input.required<string>();

  readonly providerService = inject(DataManagementIdentityProviderService);
  private readonly userAdministration = inject(UserAdministrationManagementService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastShowService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchMaxLength = DIRECTORY_ACCOUNTS_SEARCH_MAX_LENGTH;
  readonly searchText = signal('');
  readonly pendingIds = signal<ReadonlySet<string>>(new Set());
  readonly currentAccountId = this.userAdministration.currentAccountId;
  readonly showEmpty = computed(
    () =>
      !this.providerService.isLoadingAccounts() &&
      !this.providerService.accountsLoadFailed() &&
      this.providerService.directoryAccounts().length === 0
  );

  private readonly search$ = new Subject<string>();

  constructor() {
    effect(() => {
      const providerId = this.providerId();
      untracked(() => {
        this.searchText.set('');
        this.providerService.clearDirectoryAccounts();
        this.providerService.loadDirectoryAccounts(providerId, '');
      });
    });

    this.search$
      .pipe(
        debounceTime(DIRECTORY_ACCOUNTS_SEARCH_DEBOUNCE_MS),
        map((search): IDirectoryAccountsRequest => ({ providerId: this.providerId(), search })),
        distinctUntilChanged((a, b) => a.providerId === b.providerId && a.search === b.search),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ providerId, search }) => this.providerService.loadDirectoryAccounts(providerId, search));

    this.destroyRef.onDestroy(() => this.providerService.clearDirectoryAccounts());
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.search$.next(value.trim());
  }

  isOwnAccount(account: IDirectoryAccount): boolean {
    return account.userId !== null && account.userId === this.currentAccountId();
  }

  isToggleDisabled(account: IDirectoryAccount): boolean {
    if (this.pendingIds().has(account.externalId) || this.isOwnAccount(account)) {
      return true;
    }
    if (account.userId === null && account.email === null) {
      return true;
    }
    if (this.isBlockedByEmailInUse(account) || this.isBlockedByRoles(account)) {
      return true;
    }
    return !account.isInDirectory && !account.mayLogin;
  }

  /** The e-mail already belongs to another Klacks account; the administrator must delete it or change its e-mail first. */
  isBlockedByEmailInUse(account: IDirectoryAccount): boolean {
    return account.emailInUse && !account.mayLogin;
  }

  /** A deactivated linked account that still carries roles is reactivated in the user administration, not here. */
  isBlockedByRoles(account: IDirectoryAccount): boolean {
    return account.userId !== null && !account.mayLogin && account.hasRoles;
  }

  async onToggle(account: IDirectoryAccount, event: Event): Promise<void> {
    const box = event.target as HTMLInputElement;
    const mayLogin = box.checked;
    this.setPending(account.externalId, true);

    const outcome = await this.providerService.setDirectoryAccountAccess(
      this.providerId(),
      account.externalId,
      mayLogin
    );

    this.setPending(account.externalId, false);
    if (outcome.account === null) {
      box.checked = account.mayLogin;
      const key = this.errorKeyOf(outcome.errorCode);
      this.toast.showError(this.translate.instant(key), key);
    }
  }

  private errorKeyOf(errorCode: string | null): string {
    return (errorCode !== null ? DIRECTORY_ACCOUNT_ERROR_KEYS[errorCode] : undefined) ?? DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY;
  }

  private setPending(externalId: string, isPending: boolean): void {
    this.pendingIds.update((ids) => {
      const next = new Set(ids);
      if (isPending) {
        next.add(externalId);
      } else {
        next.delete(externalId);
      }
      return next;
    });
  }
}
