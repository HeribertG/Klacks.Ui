// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISetting } from './setting.interface';

export class Setting implements ISetting {
  id = undefined;
  type = '';
  value = '';
}
