// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroup } from 'src/app/domain/models/group/group.interface';

export interface GroupReportRow extends IGroup {
  parentName?: string;
}
