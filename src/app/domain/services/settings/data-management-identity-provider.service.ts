import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataIdentityProviderService } from 'src/app/infrastructure/api/settings/data-identity-provider.service';
import { IdentityProvider } from 'src/app/domain/models/settings/identity-provider-class';
import {
  IIdentityProviderListItem,
  ITestConnectionResult,
  ISyncResult,
  ICreateIdentityProviderRequest,
  IUpdateIdentityProviderRequest
} from 'src/app/domain/interfaces/identity-provider.interface';
import { IdentityProviderType } from 'src/app/domain/enums/identity-provider-enum';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementIdentityProviderService {
  private dataService = inject(DataIdentityProviderService);
  private destroy$ = new Subject<void>();

  public providerList = signal<IIdentityProviderListItem[]>([]);
  private providerListOriginal = signal<IIdentityProviderListItem[]>([]);

  public selectedProvider = signal<IdentityProvider | null>(null);
  public isLoading = signal<boolean>(false);
  public isTesting = signal<boolean>(false);
  public isSyncing = signal<boolean>(false);
  public testResult = signal<ITestConnectionResult | null>(null);
  public syncResult = signal<ISyncResult | null>(null);
  public isDirty = computed(() => this.checkIfDirty());

  private saveCounter = 0;

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

  createNewProvider(): IdentityProvider {
    const provider = new IdentityProvider();
    provider.isDirty = CreateEntriesEnum.new;
    provider.type = IdentityProviderType.Ldap;
    provider.port = 389;
    provider.userFilter = '(&(objectClass=user)(objectCategory=person))';
    provider.sortOrder = this.providerList().length;
    this.selectedProvider.set(provider);
    return provider;
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
