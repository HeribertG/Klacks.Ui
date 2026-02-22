// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IdentityProviderType } from '../enums/identity-provider-enum';
import { CreateEntriesEnum } from '../enums/client-enum';

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
  isDirty?: CreateEntriesEnum;
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

export interface ICreateIdentityProviderRequest {
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
  attributeMapping?: Record<string, string>;
}

export interface IUpdateIdentityProviderRequest {
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
  attributeMapping?: Record<string, string>;
}
