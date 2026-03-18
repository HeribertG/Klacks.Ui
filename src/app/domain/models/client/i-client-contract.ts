// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
