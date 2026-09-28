// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClient } from './i-client';

export interface IMembership {
  id: string | undefined;
  clientId: string | undefined;
  client: IClient | undefined;
  validFrom: Date;
  validUntil: Date | undefined;

  type: number | string;
}
