// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAssignedGroup } from './assigned-group.interface';

export class AssignedGroup implements IAssignedGroup {
  iid?: string = undefined;
  clientId = '';
  groupId = '';
  groupName = '';
  id?: string;
}
