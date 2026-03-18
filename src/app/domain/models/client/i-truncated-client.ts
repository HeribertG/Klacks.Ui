// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IBaseTruncated } from '../general-class';
import { IClient } from './i-client';

export interface ITruncatedClient extends IBaseTruncated {
  clients: IClient[];
  editor: string;
  lastChange: Date | string;
}
