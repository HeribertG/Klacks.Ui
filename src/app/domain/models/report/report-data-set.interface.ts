// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DataBindingDefinition } from './data-binding-definition.interface';

export interface ReportDataSet {
  id: string;
  i18nKey: string;
  headerFields: DataBindingDefinition[];
  tableFields: DataBindingDefinition[];
  footerFields: DataBindingDefinition[];
}
