// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IFilter } from './i-filter';

export interface IExportClient {
  filter: IFilter;
  selection: string[];
  selectAll: boolean;
  invertedSelection: boolean;
  type: number | undefined;
}
