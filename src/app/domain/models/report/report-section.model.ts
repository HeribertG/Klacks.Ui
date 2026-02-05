import { ReportField } from './report-field.model';

export interface ReportSection {
  id?: string;
  type: ReportSectionType;
  fields: ReportField[];
  visible: boolean;
  sortOrder: number;
}

export enum ReportSectionType {
  Header = 0,
  WorkTable = 1,
  ExpensesTable = 2,
  Footer = 3
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
    type: ReportSectionType.ExpensesTable,
    fields: [],
    visible: true,
    sortOrder: 2
  },
  {
    type: ReportSectionType.Footer,
    fields: [],
    visible: true,
    sortOrder: 3
  }
];
