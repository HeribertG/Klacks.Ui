import { IdentityProviderType } from '../enums/identity-provider-enum';
import { IIdentityProvider } from '../interfaces/identity-provider.interface';

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
