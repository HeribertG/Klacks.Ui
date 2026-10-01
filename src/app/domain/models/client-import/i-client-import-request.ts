// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ClientImportDateFormat, ClientImportNameOrder } from 'src/app/domain/enums/client-import.enums';
import { IClientImportColumn } from './i-client-import-column';
import { IClientImportColumnMapping } from './i-client-import-column-mapping';
import { IClientImportPolicy } from './i-client-import-policy';
import { IClientImportRowOverride } from './i-client-import-row-override';

export interface IClientImportRequest {
  token: string;
  fileName: string;
  columns: IClientImportColumn[];
  rows: string[][];
  mapping: IClientImportColumnMapping[];
  dateFormat: ClientImportDateFormat;
  nameOrder: ClientImportNameOrder;
  policy: IClientImportPolicy;
  rowOverrides: IClientImportRowOverride[];
}
