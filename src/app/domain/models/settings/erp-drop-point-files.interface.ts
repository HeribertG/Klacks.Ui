// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';

export interface IErpDropPointFiles {
  inbox: IErpImportFile[];
  processed: IErpImportFile[];
  failed: IErpImportFile[];
}
