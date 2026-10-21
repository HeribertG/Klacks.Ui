// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroup } from './group.interface';

export interface IGroupTree {
  rootId?: string;
  nodes: IGroup[];
}
