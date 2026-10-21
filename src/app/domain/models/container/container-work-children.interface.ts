// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SubWorkResource } from './sub-work-resource.interface';
import { SubBreakResource } from './sub-break-resource.interface';
import { WorkChangeResource } from './work-change-resource.interface';

export interface ContainerWorkChildren {
  subWorks: SubWorkResource[];
  subBreaks: SubBreakResource[];
  subWorkChanges: WorkChangeResource[];
  parentStartBase?: string | null;
  parentEndBase?: string | null;
  parentTransportMode?: number | null;
  parentWorkTime?: number;
  parentStartTime?: string | null;
  parentEndTime?: string | null;
}
