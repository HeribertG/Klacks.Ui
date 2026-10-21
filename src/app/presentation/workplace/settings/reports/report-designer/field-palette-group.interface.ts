// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { FieldCategory } from 'src/app/domain/models/report/field-category.enum';
import { ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { DataBindingDefinition } from 'src/app/domain/models/report/data-binding-definition.interface';

export interface FieldPaletteGroup {
  id: string;
  titleKey: string;
  title?: string;
  category: FieldCategory;
  sectionType: ReportSectionType;
  fields: DataBindingDefinition[];
  collapsed: boolean;
}
