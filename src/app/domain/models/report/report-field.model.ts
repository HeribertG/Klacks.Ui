// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { CellBorderStyle } from './cell-border-style.model';

export interface ReportField {
  id?: string;
  name: string;
  dataBinding: string;
  type: ReportFieldType;
  width: number;
  height: number;
  style: FieldStyle;
  format?: string;
  formula?: string;
  sortOrder: number;
  imageUrl?: string;
  hideLabel?: boolean;
  additionalBindings?: string[];
  bindingSeparator?: string;
  sortDirection?: 'asc' | 'desc';
  styleConditions?: StyleCondition[];
}

/**
 * Conditional formatting rule. The expression is evaluated per row with the
 * Klacks script engine and has to emit a truthy value via `output 1, <expression>`.
 */
export interface StyleCondition {
  expression: string;
  textColor?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface HeaderRow {
  rowIndex: number;
  left: ReportField[];
  center: ReportField[];
  right: ReportField[];
}

export enum ReportFieldType {
  Text = 0,
  Date = 1,
  Number = 2,
  Currency = 3,
  Boolean = 4,
  Time = 5,
  Image = 6,
  Formula = 7,
  Signature = 8,
  PageNumber = 9
}

export const STATIC_IMAGE_DATA_BINDING = 'report.image';

export enum TextAlignment {
  Left = 0,
  Center = 1,
  Right = 2
}

export interface FieldStyle {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string;
  alignment: TextAlignment;
  textColor: string;
  backgroundColor: string;
  cellBorder?: CellBorderStyle;
}

export const AVAILABLE_FONTS = [
  { value: 'helvetica', label: 'Helvetica' },
  { value: 'times', label: 'Times' },
  { value: 'courier', label: 'Courier' },
  { value: 'NotoSans', label: 'Noto Sans (Unicode)' },
];

export const DEFAULT_FIELD_STYLE: FieldStyle = {
  fontSize: 10,
  bold: false,
  italic: false,
  underline: false,
  fontFamily: 'helvetica',
  alignment: TextAlignment.Left,
  textColor: '#000000',
  backgroundColor: '#FFFFFF',
};

export interface DataBindingDefinition {
  key: string;
  label: string;
  i18nKey: string;
  type: ReportFieldType;
  category: FieldCategory;
  defaultWidth: number;
}

export enum FieldCategory {
  Header = 'header',
  WorkTable = 'workTable',
  ExpensesTable = 'expensesTable',
  Footer = 'footer'
}

export const HEADER_FIELDS: DataBindingDefinition[] = [
  { key: 'client.name', label: 'Name', i18nKey: 'setting.report.field.clientName', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'client.firstName', label: 'Vorname', i18nKey: 'setting.report.field.clientFirstName', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'client.company', label: 'Firma', i18nKey: 'setting.report.field.clientCompany', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 40 },
  { key: 'client.idNumber', label: 'Personal-Nr.', i18nKey: 'setting.report.field.clientIdNumber', type: ReportFieldType.Number, category: FieldCategory.Header, defaultWidth: 20 },
  { key: 'report.period', label: 'Zeitraum', i18nKey: 'setting.report.field.reportPeriod', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 40 },
  { key: 'report.date', label: 'Report-Datum', i18nKey: 'setting.report.field.reportDate', type: ReportFieldType.Date, category: FieldCategory.Header, defaultWidth: 25 },
  { key: 'report.groupName', label: 'Gruppe', i18nKey: 'setting.report.field.groupName', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'report.image', label: 'Bild', i18nKey: 'setting.report.field.reportImage', type: ReportFieldType.Image, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'report.customText', label: 'Freitext', i18nKey: 'setting.report.field.customText', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 40 },
];

export const WORK_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'entry.date', label: 'Datum', i18nKey: 'setting.report.field.entryDate', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'entry.weekday', label: 'Wochentag', i18nKey: 'setting.report.field.entryWeekday', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'entry.startTime', label: 'Von', i18nKey: 'setting.report.field.entryStartTime', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'entry.endTime', label: 'Bis', i18nKey: 'setting.report.field.entryEndTime', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'entry.hours', label: 'Stunden', i18nKey: 'setting.report.field.entryHours', type: ReportFieldType.Number, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'entry.surcharges', label: 'Zuschläge', i18nKey: 'setting.report.field.entrySurcharges', type: ReportFieldType.Number, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'entry.shiftName', label: 'Schicht', i18nKey: 'setting.report.field.entryShiftName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'entry.shiftAbbr', label: 'Abkürzung', i18nKey: 'setting.report.field.entryShiftAbbr', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'entry.type', label: 'Typ', i18nKey: 'setting.report.field.entryType', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'entry.information', label: 'Information', i18nKey: 'setting.report.field.entryInformation', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'entry.description', label: 'Beschreibung', i18nKey: 'setting.report.field.entryDescription', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
];

export const EXPENSES_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'expense.date', label: 'Datum', i18nKey: 'setting.report.field.expenseDate', type: ReportFieldType.Date, category: FieldCategory.ExpensesTable, defaultWidth: 15 },
  { key: 'expense.description', label: 'Beschreibung', i18nKey: 'setting.report.field.expenseDescription', type: ReportFieldType.Text, category: FieldCategory.ExpensesTable, defaultWidth: 35 },
  { key: 'expense.amount', label: 'Betrag', i18nKey: 'setting.report.field.expenseAmount', type: ReportFieldType.Currency, category: FieldCategory.ExpensesTable, defaultWidth: 15 },
  { key: 'expense.taxable', label: 'Steuerbar', i18nKey: 'setting.report.field.expenseTaxable', type: ReportFieldType.Boolean, category: FieldCategory.ExpensesTable, defaultWidth: 15 },
  { key: 'expense.shiftName', label: 'Schicht', i18nKey: 'setting.report.field.expenseShiftName', type: ReportFieldType.Text, category: FieldCategory.ExpensesTable, defaultWidth: 20 },
];

export const FOOTER_FIELDS: DataBindingDefinition[] = [
  { key: 'sum.hours', label: 'Summe Stunden', i18nKey: 'setting.report.field.sumHours', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
  { key: 'sum.surcharges', label: 'Summe Zuschläge', i18nKey: 'setting.report.field.sumSurcharges', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
  { key: 'sum.expenses', label: 'Summe Expenses', i18nKey: 'setting.report.field.sumExpenses', type: ReportFieldType.Currency, category: FieldCategory.Footer, defaultWidth: 25 },
  { key: 'sum.workDays', label: 'Arbeitstage', i18nKey: 'setting.report.field.sumWorkDays', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
];

export const ALL_AVAILABLE_FIELDS: DataBindingDefinition[] = [
  ...HEADER_FIELDS,
  ...WORK_TABLE_FIELDS,
  ...EXPENSES_TABLE_FIELDS,
  ...FOOTER_FIELDS,
];
