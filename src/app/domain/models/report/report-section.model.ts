// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportField } from './report-field.model';
import { ReportSectionType } from './report-section-type.enum';
import { FreeTextRow } from './free-text-row.model';

export interface ReportSection {
  id?: string;
  type: ReportSectionType;
  fields: ReportField[];
  visible: boolean;
  sortOrder: number;
  tableFooterFields?: ReportField[];
  freeTextRows?: FreeTextRow[];
  showFullPeriod?: boolean;
  widthPercent?: number;
  title?: string;
  groupBy?: string;
  groupSubtotals?: boolean;
  rowFilter?: string;
}

export const DEFAULT_SECTIONS: ReportSection[] = [
  {
    type: ReportSectionType.Header,
    fields: [],
    visible: true,
    sortOrder: 0
  },
  {
    type: ReportSectionType.WorkTable,
    fields: [],
    visible: true,
    sortOrder: 1
  },
  {
    type: ReportSectionType.Footer,
    fields: [],
    visible: true,
    sortOrder: 2
  }
];
