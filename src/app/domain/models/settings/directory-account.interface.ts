// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IDirectoryAccount {
  externalId: string;
  displayName: string;
  loginName: string;
  email: string | null;
  mayLogin: boolean;
  userId: string | null;
  emailInUse: boolean;
  hasRoles: boolean;
  isInDirectory: boolean;
}
