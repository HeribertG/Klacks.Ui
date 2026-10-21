// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Filter } from 'src/app/domain/models/client/filter';
import { IClientExportSelection } from 'src/app/domain/models/client/i-client-export-selection';
import { GroupFilter } from 'src/app/domain/models/group/group-filter-class';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-filter-class';
import {
  IClientAvailabilityClientFilter,
} from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';

export interface ReportFetchParams {
  groupId?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  year?: number;
  containerId?: string;
  clientFilter?: Filter;
  clientSelection?: IClientExportSelection;
  groupFilter?: GroupFilter;
  shiftFilter?: ShiftFilter;
  cardVisibility?: Record<string, boolean>;
  clientAvailabilityFilter?: IClientAvailabilityClientFilter;
}
