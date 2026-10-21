// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IdentityProviderType } from '../enums/identity-provider-enum';

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
