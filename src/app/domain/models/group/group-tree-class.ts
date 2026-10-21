// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroupTree } from './group-tree.interface';
import { Group } from './group-class';

export class GroupTree implements IGroupTree {
  rootId?: string;
  nodes: Group[] = [];
}
