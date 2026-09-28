// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseTruncated } from '../general-class';
import { IClient } from './i-client';

export interface ITruncatedClient extends IBaseTruncated {
  clients: IClient[];
  editor: string;
  lastChange: Date | string;
}
