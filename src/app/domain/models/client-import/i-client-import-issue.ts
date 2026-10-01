// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ClientImportIssueSeverity } from 'src/app/domain/enums/client-import.enums';

export interface IClientImportIssue {
  field: string | null;
  severity: ClientImportIssueSeverity;
  code: string;
  args: Record<string, string>;
}
