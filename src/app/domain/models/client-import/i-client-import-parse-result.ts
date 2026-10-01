// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ClientImportDateFormat, ClientImportNameOrder } from 'src/app/domain/enums/client-import.enums';
import { IClientImportColumn } from './i-client-import-column';
import { IClientImportColumnMapping } from './i-client-import-column-mapping';

export interface IClientImportParseResult {
  token: string;
  fileName: string;
  sheets: string[];
  sheetName: string | null;
  headerRowIndex: number;
  columns: IClientImportColumn[];
  rows: string[][];
  mapping: IClientImportColumnMapping[];
  dateFormat: ClientImportDateFormat;
  dateFormatAmbiguous: boolean;
  nameOrder: ClientImportNameOrder;
  delimiter: string | null;
  encoding: string | null;
}
