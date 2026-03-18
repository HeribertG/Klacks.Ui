// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IFilter } from './i-filter';

export interface IExportClient {
  filter: IFilter;
  selection: string[];
  selectAll: boolean;
  invertedSelection: boolean;
  type: number | undefined;
}
