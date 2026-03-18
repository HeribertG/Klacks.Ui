// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IExportClient } from './i-export-client';
import { Filter } from './filter';

export class ExportClient implements IExportClient {
  filter = new Filter();
  selection: string[] = [];
  selectAll = false;
  invertedSelection = false;
  type = undefined;
}
