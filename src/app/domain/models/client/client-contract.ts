// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClientContract } from './i-client-contract';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

export class ClientContract implements IClientContract {
  id = '';
  clientId = '';
  contractId = '';
  contract = undefined;
  fromDate = companyToday();
  untilDate: Date | undefined = undefined;
  isActive = false;
}
