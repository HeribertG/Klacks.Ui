// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroupItem } from './group-item.interface';
import { Client } from '../client/client-class';
import { Group } from './group-class';

export class GroupItem implements IGroupItem {
  id?: string;
  groupId?: string;
  clientId?: string;
  client?: Client;
  group?: Group;
  validFrom?: Date;
  validUntil?: Date;
}
