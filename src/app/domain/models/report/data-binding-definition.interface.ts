// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportFieldType } from './report-field-type.enum';
import { FieldCategory } from './field-category.enum';

export interface DataBindingDefinition {
  key: string;
  label: string;
  i18nKey: string;
  type: ReportFieldType;
  category: FieldCategory;
  defaultWidth: number;
}
