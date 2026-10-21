// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseTruncated } from '../base-truncated.interface';
import { IGroup } from './group.interface';

export interface ITruncatedGroup extends IBaseTruncated {
  groups: IGroup[];
}
