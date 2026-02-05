import { ReportField } from './report-field.model';

export interface ReportSection {
  id?: string;
  type: ReportSectionType;
  height: number;
  fields: ReportField[];
  visible: boolean;
  sortOrder: number;
  backgroundColor?: string;
}

export enum ReportSectionType {
  Header = 0,
  PageHeader = 1,
  Detail = 2,
  PageFooter = 3,
  Footer = 4,
  GroupHeader = 5,
  GroupFooter = 6
}

export const DEFAULT_SECTIONS: ReportSection[] = [
  {
    type: ReportSectionType.Header,
    height: 80,
    fields: [],
    visible: true,
    sortOrder: 0
  },
  {
    type: ReportSectionType.Detail,
    height: 50,
    fields: [],
    visible: true,
    sortOrder: 1
  },
  {
    type: ReportSectionType.Footer,
    height: 30,
    fields: [],
    visible: true,
    sortOrder: 2
  }
];
