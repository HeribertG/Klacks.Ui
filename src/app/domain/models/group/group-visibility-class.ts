// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroupVisibility } from './group-visibility.interface';

export class GroupVisibility implements IGroupVisibility {
  id?: string;
  groupId?: string;
  appUserId?: string;
}
