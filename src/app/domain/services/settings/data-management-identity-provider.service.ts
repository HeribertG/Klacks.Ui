// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject, signal, computed } from '@angular/core';
import { EMPTY, Observable, Subject, firstValueFrom, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { DataIdentityProviderService } from 'src/app/infrastructure/api/settings/data-identity-provider.service';
import { IdentityProvider } from 'src/app/domain/models/settings/identity-provider-class';
import { IIdentityProviderListItem } from 'src/app/domain/interfaces/identity-provider-list-item.interface';
import { ITestConnectionResult } from 'src/app/domain/interfaces/test-connection-result.interface';
import { ISyncResult } from 'src/app/domain/interfaces/sync-result.interface';
import { ICreateIdentityProviderRequest } from 'src/app/domain/interfaces/create-identity-provider-request.interface';
import { IUpdateIdentityProviderRequest } from 'src/app/domain/interfaces/update-identity-provider-request.interface';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { cloneObject, compareComplexObjects } from 'src/app/domain/helpers/object.helper';
import { readRefusalCode } from 'src/app/domain/helpers/read-refusal-code.helper';
import { IDirectoryAccount } from 'src/app/domain/models/settings/directory-account.interface';
import { IDirectoryAccountList } from 'src/app/domain/models/settings/directory-account-list.interface';
import { IDirectoryAccountsRequest } from 'src/app/domain/models/settings/directory-accounts-request.interface';
import { IDirectoryAccountAccessOutcome } from 'src/app/domain/models/settings/directory-account-access-outcome.interface';
import { UserAdministrationManagementService } from './user-administration-management.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementIdentityProviderService {
  private dataService = inject(DataIdentityProviderService);
  private userAdministration = inject(UserAdministrationManagementService);
  private destroy$ = new Subject<void>();
  private directoryAccountsRequest$ = new Subject<IDirectoryAccountsRequest | null>();

  public providerList = signal<IIdentityProviderListItem[]>([]);
  private providerListOriginal = signal<IIdentityProviderListItem[]>([]);

  public selectedProvider = signal<IdentityProvider | null>(null);
  public isLoading = signal<boolean>(false);
  public isTesting = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public testResult = signal<ITestConnectionResult | null>(null);
  public syncResult = signal<ISyncResult | null>(null);
  public isDirty = computed(() => this.checkIfDirty());

  public directoryAccounts = signal<IDirectoryAccount[]>([]);
  public isLoadingAccounts = signal<boolean>(false);
  public accountsTruncated = signal<boolean>(false);
  public accountsLoadFailed = signal<boolean>(false);

  constructor() {
    this.directoryAccountsRequest$
      .pipe(
        switchMap((request) => (request ? this.fetchDirectoryAccounts(request) : EMPTY)),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => this.applyDirectoryAccounts(result));
  }

  loadProviders(): void {
    this.isLoading.set(true);

    this.dataService
      .getProviders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (providers) => {
          if (providers) {
            const sortedProviders = this.sortProviders(providers);
            this.providerList.set(sortedProviders);
            this.providerListOriginal.set(cloneObject(sortedProviders));
          }
        },
        error: (error) => {
          console.error('Failed to load identity providers:', error);
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  async loadProvidersAsync(): Promise<void> {
    const providers = await firstValueFrom(this.dataService.getProviders());
    if (providers) {
      const sortedProviders = this.sortProviders(providers);
      this.providerList.set(sortedProviders);
      this.providerListOriginal.set(cloneObject(sortedProviders));
    }
  }

  private sortProviders(providers: IIdentityProviderListItem[]): IIdentityProviderListItem[] {
    return [...providers].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async loadProvider(id: string): Promise<IdentityProvider | null> {
    try {
      const provider = await firstValueFrom(this.dataService.getProvider(id));
      if (provider) {
        const identityProvider = Object.assign(new IdentityProvider(), provider);
        this.selectedProvider.set(identityProvider);
        return identityProvider;
      }
      return null;
    } catch (error) {
      console.error('Failed to load identity provider:', error);
      return null;
    }
  }

  async saveProvider(provider: IdentityProvider): Promise<boolean> {
    try {
      if (provider.isDirty === CreateEntriesEnum.new) {
        const request: ICreateIdentityProviderRequest = {
          name: provider.name,
          type: provider.type,
          isEnabled: provider.isEnabled,
          sortOrder: provider.sortOrder,
          useForAuthentication: provider.useForAuthentication,
          useForClientImport: provider.useForClientImport,
          host: provider.host,
          port: provider.port,
          useSsl: provider.useSsl,
          baseDn: provider.baseDn,
          bindDn: provider.bindDn,
          bindPassword: provider.bindPassword,
          userFilter: provider.userFilter,
          clientId: provider.clientId,
          clientSecret: provider.clientSecret,
          authorizationUrl: provider.authorizationUrl,
          tokenUrl: provider.tokenUrl,
          userInfoUrl: provider.userInfoUrl,
          scopes: provider.scopes,
          tenantId: provider.tenantId,
          attributeMapping: provider.attributeMapping,
        };

        const created = await firstValueFrom(this.dataService.createProvider(request));
        provider.id = created.id;
        provider.isDirty = undefined;
      } else {
        const request: IUpdateIdentityProviderRequest = {
          name: provider.name,
          type: provider.type,
          isEnabled: provider.isEnabled,
          sortOrder: provider.sortOrder,
          useForAuthentication: provider.useForAuthentication,
          useForClientImport: provider.useForClientImport,
          host: provider.host,
          port: provider.port,
          useSsl: provider.useSsl,
          baseDn: provider.baseDn,
          bindDn: provider.bindDn,
          bindPassword: provider.bindPassword,
          userFilter: provider.userFilter,
          clientId: provider.clientId,
          clientSecret: provider.clientSecret,
          authorizationUrl: provider.authorizationUrl,
          tokenUrl: provider.tokenUrl,
          userInfoUrl: provider.userInfoUrl,
          scopes: provider.scopes,
          tenantId: provider.tenantId,
          attributeMapping: provider.attributeMapping,
        };

        await firstValueFrom(this.dataService.updateProvider(provider.id, request));
      }

      await this.loadProvidersAsync();
      return true;
    } catch (error) {
      console.error('Failed to save identity provider:', error);
      return false;
    }
  }

  async deleteProvider(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.dataService.deleteProvider(id));
      await this.loadProvidersAsync();
      return true;
    } catch (error) {
      console.error('Failed to delete identity provider:', error);
      return false;
    }
  }

  async testConnection(id: string): Promise<ITestConnectionResult> {
    this.isTesting.set(true);
    this.testResult.set(null);

    try {
      const result = await firstValueFrom(this.dataService.testConnection(id));
      this.testResult.set(result);
      return result;
    } catch (error) {
      const errorResult: ITestConnectionResult = {
        success: false,
        isTruncated: false,
        errorMessage: error instanceof Error ? error.message : 'Connection test failed',
      };
      this.testResult.set(errorResult);
      return errorResult;
    } finally {
      this.isTesting.set(false);
    }
  }

  async syncClients(id: string): Promise<ISyncResult> {
    this.isSyncing.set(true);
    this.syncResult.set(null);

    try {
      const result = await firstValueFrom(this.dataService.syncClients(id));
      this.syncResult.set(result);
      await this.loadProvidersAsync();
      return result;
    } catch (error) {
      const errorResult: ISyncResult = {
        success: false,
        totalProcessed: 0,
        newClients: 0,
        updatedClients: 0,
        deactivatedClients: 0,
        errorMessage: error instanceof Error ? error.message : 'Sync failed',
        syncTime: new Date().toISOString(),
      };
      this.syncResult.set(errorResult);
      return errorResult;
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Loads the approval list of a directory provider. A newer call supersedes one still in flight, so a slow answer to
   * an older search can never overwrite the rows of the current one.
   * @param providerId - Persisted id of the LDAP/AD provider
   * @param search - Search text; empty lists everyone the directory returns
   */
  loadDirectoryAccounts(providerId: string, search: string): void {
    this.isLoadingAccounts.set(true);
    this.accountsLoadFailed.set(false);
    this.directoryAccountsRequest$.next({ providerId, search });
  }

  /** Drops the rows of the previous provider and cancels a load still in flight. */
  clearDirectoryAccounts(): void {
    this.directoryAccountsRequest$.next(null);
    this.directoryAccounts.set([]);
    this.isLoadingAccounts.set(false);
    this.accountsTruncated.set(false);
    this.accountsLoadFailed.set(false);
  }

  /**
   * Approves or withdraws the sign-in of a directory account. On success the row is replaced by the server's answer and
   * the user list is reloaded, because an approval can create, link, deactivate or reactivate a Klacks account.
   * @param providerId - Persisted id of the LDAP/AD provider
   * @param externalId - Stable directory id of the account
   * @param mayLogin - True approves, false withdraws
   * @returns The changed row, or the server's refusal code (null when the failure carried none)
   */
  async setDirectoryAccountAccess(
    providerId: string,
    externalId: string,
    mayLogin: boolean
  ): Promise<IDirectoryAccountAccessOutcome> {
    try {
      const account = await firstValueFrom(
        this.dataService.setDirectoryAccountAccess(providerId, externalId, mayLogin)
      );
      this.directoryAccounts.update((rows) =>
        rows.map((row) => (row.externalId === externalId ? account : row))
      );
      this.userAdministration.loadAccounts();
      return { account, errorCode: null };
    } catch (error) {
      console.error('Failed to change directory account access:', error);
      return { account: null, errorCode: readRefusalCode(error) };
    }
  }

  private fetchDirectoryAccounts(request: IDirectoryAccountsRequest): Observable<IDirectoryAccountList | null> {
    return this.dataService.getDirectoryAccounts(request.providerId, request.search).pipe(
      map((result) => result ?? null),
      catchError((error) => {
        console.error('Failed to load directory accounts:', error);
        return of(null);
      })
    );
  }

  private applyDirectoryAccounts(result: IDirectoryAccountList | null): void {
    const loaded = result !== null && result.success;
    this.directoryAccounts.set(loaded ? result.accounts : []);
    this.accountsTruncated.set(loaded && result.isTruncated);
    this.accountsLoadFailed.set(!loaded);
    this.isLoadingAccounts.set(false);
  }

  private checkIfDirty(): boolean {
    const listOfExcludedProperties = ['isDirty'];
    const current = this.providerList();
    const original = this.providerListOriginal();
    return !compareComplexObjects(current, original, listOfExcludedProperties);
  }

  clearSelectedProvider(): void {
    this.selectedProvider.set(null);
    this.testResult.set(null);
    this.syncResult.set(null);
  }

  resetData(): void {
    this.loadProviders();
  }

  async resetDataAsync(): Promise<void> {
    await this.loadProvidersAsync();
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
