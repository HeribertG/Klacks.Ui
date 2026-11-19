// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IDirectoryAccount } from './directory-account.interface';

export interface IDirectoryAccountList {
  success: boolean;
  isTruncated: boolean;
  accounts: IDirectoryAccount[];
}
