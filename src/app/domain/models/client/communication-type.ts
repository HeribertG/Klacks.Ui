// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICommunicationType } from './i-communication-type';

export class CommunicationType implements ICommunicationType {
  id = 0;
  name = '';
  type = 0;
  category = 0;
  defaultIndex = 0;
}
