// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBranch } from './branch.interface';

export class Branch implements IBranch {
  id = '';
  name = '';
  address = '';
  phone = '';
  email = '';
  select = false;
  isDirty = 0;
}
