// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IExportClient } from './i-export-client';
import { Filter } from './filter';

export class ExportClient implements IExportClient {
  filter = new Filter();
  selection: string[] = [];
  selectAll = false;
  invertedSelection = false;
  type = undefined;
}
