export enum IdentityProviderType {
  Ldap = 0,
  ActiveDirectory = 1,
  OAuth2 = 2,
  OpenIdConnect = 3
}

export interface IIdentityProvider {
  id: string;
  name: string;
  type: IdentityProviderType;
  isEnabled: boolean;
  sortOrder: number;
  useForAuthentication: boolean;
  useForClientImport: boolean;
  host?: string;
  port?: number;
  useSsl: boolean;
  baseDn?: string;
  bindDn?: string;
  bindPassword?: string;
  userFilter?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string;
  tenantId?: string;
  lastSyncTime?: string;
  lastSyncCount?: number;
  lastSyncError?: string;
  attributeMapping?: Record<string, string>;
}

export interface IIdentityProviderListItem {
  id: string;
  name: string;
  type: IdentityProviderType;
  isEnabled: boolean;
  sortOrder: number;
  useForAuthentication: boolean;
  useForClientImport: boolean;
  lastSyncTime?: string;
  lastSyncCount?: number;
  lastSyncError?: string;
}

export interface ITestConnectionResult {
  success: boolean;
  errorMessage?: string;
  userCount?: number;
  sampleUsers?: string[];
}

export interface ISyncResult {
  success: boolean;
  totalProcessed: number;
  newClients: number;
  updatedClients: number;
  deactivatedClients: number;
  errorMessage?: string;
  syncTime: string;
}

export class IdentityProvider implements IIdentityProvider {
  id = '';
  name = '';
  type = IdentityProviderType.Ldap;
  isEnabled = false;
  sortOrder = 0;
  useForAuthentication = false;
  useForClientImport = true;
  host?: string;
  port?: number;
  useSsl = false;
  baseDn?: string;
  bindDn?: string;
  bindPassword?: string;
  userFilter?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string;
  tenantId?: string;
  lastSyncTime?: string;
  lastSyncCount?: number;
  lastSyncError?: string;
  attributeMapping?: Record<string, string>;

  isDirty?: number;
}

export const IdentityProviderTypeLabels: Record<IdentityProviderType, string> = {
  [IdentityProviderType.Ldap]: 'settings.identity-provider.type.ldap',
  [IdentityProviderType.ActiveDirectory]: 'settings.identity-provider.type.active-directory',
  [IdentityProviderType.OAuth2]: 'settings.identity-provider.type.oauth2',
  [IdentityProviderType.OpenIdConnect]: 'settings.identity-provider.type.openid-connect'
};
