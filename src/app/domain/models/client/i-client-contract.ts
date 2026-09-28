// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContract } from '../contract/contract-class';

export interface IClientContract {
  id: string | undefined;
  clientId: string | undefined;
  contractId: string | undefined;
  contract: IContract | undefined;
  fromDate: Date;
  untilDate: Date | undefined;
  isActive: boolean;
}
