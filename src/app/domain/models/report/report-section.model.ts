// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ReportField } from './report-field.model';
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

export enum ReportSectionType {
  Header = 0,
  WorkTable = 1,
  ExpensesTable = 2,
  Footer = 3,
  GroupHeader = 4,
  GroupFooter = 5,
  PageHeader = 6,
  PageFooter = 7
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
