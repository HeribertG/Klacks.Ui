// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ErrorListFilterType } from 'src/app/domain/interfaces/error-list-filter-type.type';

export interface ScenarioComplianceIssue {
  date: string;
  clientId: string;
  clientName: string;
  severity: ErrorListFilterType;
  code: string;
  messageKey: string;
  messageParams: Record<string, string>;
}
