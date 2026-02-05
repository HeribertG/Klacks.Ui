export interface ReportField {
  id?: string;
  name: string;
  dataBinding: string;
  type: ReportFieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  style: FieldStyle;
  format?: string;
  formula?: string;
  sortOrder: number;
}

export enum ReportFieldType {
  Text = 0,
  Date = 1,
  Number = 2,
  Currency = 3,
  Boolean = 4,
  Formula = 5,
  Image = 6
}

export interface FieldStyle {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textColor: string;
  backgroundColor: string;
  alignment: TextAlignment;
  border: BorderStyle;
}

export enum TextAlignment {
  Left = 0,
  Center = 1,
  Right = 2,
  Justified = 3
}

export interface BorderStyle {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
  width: number;
  color: string;
}

export const DEFAULT_FIELD_STYLE: FieldStyle = {
  fontFamily: 'Arial',
  fontSize: 10,
  bold: false,
  italic: false,
  underline: false,
  textColor: '#000000',
  backgroundColor: '#FFFFFF',
  alignment: TextAlignment.Left,
  border: {
    left: false,
    right: false,
    top: false,
    bottom: false,
    width: 1,
    color: '#000000'
  }
};

export const AVAILABLE_DATA_BINDINGS = [
  { key: 'client.fullName', label: 'Client Full Name', type: ReportFieldType.Text },
  { key: 'client.firstName', label: 'Client First Name', type: ReportFieldType.Text },
  { key: 'client.name', label: 'Client Last Name', type: ReportFieldType.Text },
  { key: 'report.period', label: 'Report Period', type: ReportFieldType.Text },
  { key: 'report.date', label: 'Report Date', type: ReportFieldType.Date },
  { key: 'work.date', label: 'Work Date', type: ReportFieldType.Date },
  { key: 'work.day', label: 'Work Day', type: ReportFieldType.Text },
  { key: 'work.beginTime', label: 'Begin Time', type: ReportFieldType.Text },
  { key: 'work.endTime', label: 'End Time', type: ReportFieldType.Text },
  { key: 'work.timeRange', label: 'Time Range', type: ReportFieldType.Text },
  { key: 'work.location', label: 'Location', type: ReportFieldType.Text },
  { key: 'work.activity', label: 'Activity', type: ReportFieldType.Text },
  { key: 'work.hours', label: 'Hours', type: ReportFieldType.Number },
  { key: 'work.notes', label: 'Notes', type: ReportFieldType.Text }
];
