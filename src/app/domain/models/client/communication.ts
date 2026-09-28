// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICommunication } from './i-communication';

export class Communication implements ICommunication {
  prefix = '';
  id = '';
  clientId = '';
  type = 0;
  value = '';
  isPhone = false;
  isEmail = false;
  index = 0;
}
