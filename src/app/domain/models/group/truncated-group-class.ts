// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseTruncated } from '../base-truncated-class';
import { ITruncatedGroup } from './truncated-group.interface';
import { IGroup } from './group.interface';

export class TruncatedGroup extends BaseTruncated implements ITruncatedGroup {
  groups: IGroup[] = [];
}
