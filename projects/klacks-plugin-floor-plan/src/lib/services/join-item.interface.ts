// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { FabricObject } from 'fabric';
import { JoinNode } from './join-node.interface';

export interface JoinItem {
  obj: FabricObject;
  nodes: JoinNode[];
  isClosed: boolean;
}
