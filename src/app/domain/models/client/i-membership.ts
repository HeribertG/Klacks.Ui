// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IClient } from './i-client';

export interface IMembership {
  id: string | undefined;
  clientId: string | undefined;
  client: IClient | undefined;
  validFrom: Date;
  validUntil: Date | undefined;

  type: number | string;
}
