// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HeaderDirection } from './header-direction.enum';

export interface IHeaderProperties {
  order: HeaderDirection;
  filter: string;
}
