// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IDirectoryAccount } from './directory-account.interface';

export interface IDirectoryAccountAccessOutcome {
  account: IDirectoryAccount | null;
  errorCode: string | null;
}
