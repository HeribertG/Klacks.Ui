// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ClientImportTarget } from 'src/app/domain/enums/client-import.enums';

export interface IClientImportColumnMapping {
  columnIndex: number;
  target: ClientImportTarget;
  confidence: number;
}
