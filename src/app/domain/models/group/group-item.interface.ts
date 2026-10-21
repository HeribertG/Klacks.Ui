// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClient } from '../client/client-class';
import { IGroup } from './group.interface';

export interface IGroupItem {
  id?: string;
  groupId?: string;
  clientId?: string;
  client?: IClient;
  group?: IGroup;
  validFrom?: Date;
  validUntil?: Date;
}
