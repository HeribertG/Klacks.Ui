// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IClientContract } from './i-client-contract';

export class ClientContract implements IClientContract {
  id = '';
  clientId = '';
  contractId = '';
  contract = undefined;
  fromDate = new Date();
  untilDate: Date | undefined = undefined;
  isActive = false;
}
