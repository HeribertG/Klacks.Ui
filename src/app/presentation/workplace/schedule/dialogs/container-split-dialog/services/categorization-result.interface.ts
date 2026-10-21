// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SubWorkResource } from 'src/app/domain/models/container/sub-work-resource.interface';
import { SubBreakResource } from 'src/app/domain/models/container/sub-break-resource.interface';
import { WorkChangeResource } from 'src/app/domain/models/container/work-change-resource.interface';

export interface CategorizationResult {
  beforeWorks: SubWorkResource[];
  afterWorks: SubWorkResource[];
  beforeBreaks: SubBreakResource[];
  afterBreaks: SubBreakResource[];
  beforeWorkChanges: WorkChangeResource[];
  afterWorkChanges: WorkChangeResource[];
}
