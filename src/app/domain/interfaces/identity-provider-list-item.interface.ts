// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IdentityProviderType } from '../enums/identity-provider-enum';
import { CreateEntriesEnum } from '../enums/client-enum';

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
