// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  DataBindingDefinition,
  FieldCategory,
  ReportFieldType,
  WORK_TABLE_FIELDS,
  EXPENSES_TABLE_FIELDS,
  FOOTER_FIELDS,
} from './report-field.model';

export interface ReportDataSource {
  id: string;
  path: string;
  i18nKey: string;
  dataSets: ReportDataSet[];
  multiSelect?: boolean;
}

export interface ReportDataSet {
  id: string;
  i18nKey: string;
  headerFields: DataBindingDefinition[];
  tableFields: DataBindingDefinition[];
  footerFields: DataBindingDefinition[];
}

const COMMON_HEADER_FIELDS: DataBindingDefinition[] = [
  { key: 'report.period', label: 'Zeitraum', i18nKey: 'setting.report.field.reportPeriod', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 40 },
  { key: 'report.date', label: 'Report-Datum', i18nKey: 'setting.report.field.reportDate', type: ReportFieldType.Date, category: FieldCategory.Header, defaultWidth: 25 },
  { key: 'report.groupName', label: 'Gruppe', i18nKey: 'setting.report.field.groupName', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'report.image', label: 'Bild', i18nKey: 'setting.report.field.reportImage', type: ReportFieldType.Image, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'report.customText', label: 'Freitext', i18nKey: 'setting.report.field.customText', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 40 },
];

const CLIENT_HEADER_FIELDS: DataBindingDefinition[] = [
  { key: 'client.name', label: 'Name', i18nKey: 'setting.report.field.clientName', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'client.firstName', label: 'Vorname', i18nKey: 'setting.report.field.clientFirstName', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 30 },
  { key: 'client.company', label: 'Firma', i18nKey: 'setting.report.field.clientCompany', type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 40 },
  { key: 'client.idNumber', label: 'Personal-Nr.', i18nKey: 'setting.report.field.clientIdNumber', type: ReportFieldType.Number, category: FieldCategory.Header, defaultWidth: 20 },
];

const ABSENCE_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'absence.clientName', label: 'Name', i18nKey: 'setting.report.field.absenceClientName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'absence.clientFirstName', label: 'Vorname', i18nKey: 'setting.report.field.absenceClientFirstName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'absence.absenceName', label: 'Abwesenheit', i18nKey: 'setting.report.field.absenceName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'absence.from', label: 'Von', i18nKey: 'setting.report.field.absenceFrom', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'absence.until', label: 'Bis', i18nKey: 'setting.report.field.absenceUntil', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'absence.value', label: 'Wert', i18nKey: 'setting.report.field.absenceValue', type: ReportFieldType.Number, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'absence.information', label: 'Information', i18nKey: 'setting.report.field.absenceInformation', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 25 },
];

const ABSENCE_FOOTER_FIELDS: DataBindingDefinition[] = [
  { key: 'absence.totalCount', label: 'Anzahl Abwesenheiten', i18nKey: 'setting.report.field.absenceTotalCount', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
  { key: 'absence.totalValue', label: 'Gesamtwert', i18nKey: 'setting.report.field.absenceTotalValue', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 10 },
];

const CLIENT_LIST_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'client.list.idNumber', label: 'Nr.', i18nKey: 'setting.report.field.clientListIdNumber', type: ReportFieldType.Number, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'client.list.company', label: 'Firma', i18nKey: 'setting.report.field.clientListCompany', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 25 },
  { key: 'client.list.firstName', label: 'Vorname', i18nKey: 'setting.report.field.clientListFirstName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'client.list.name', label: 'Name', i18nKey: 'setting.report.field.clientListName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'client.list.gender', label: 'Geschlecht', i18nKey: 'setting.report.field.clientListGender', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'client.list.type', label: 'Typ', i18nKey: 'setting.report.field.clientListType', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'client.list.birthdate', label: 'Geburtstag', i18nKey: 'setting.report.field.clientListBirthdate', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
];

const CLIENT_LIST_FOOTER_FIELDS: DataBindingDefinition[] = [
  { key: 'client.totalCount', label: 'Anzahl Adressen', i18nKey: 'setting.report.field.clientTotalCount', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
];

const ADDRESS_DETAIL_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'address.type', label: 'Typ', i18nKey: 'setting.report.field.addressType', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'address.street', label: 'Strasse', i18nKey: 'setting.report.field.addressStreet', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 25 },
  { key: 'address.zip', label: 'PLZ', i18nKey: 'setting.report.field.addressZip', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'address.city', label: 'Ort', i18nKey: 'setting.report.field.addressCity', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'address.country', label: 'Land', i18nKey: 'setting.report.field.addressCountry', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'address.validFrom', label: 'Gültig ab', i18nKey: 'setting.report.field.addressValidFrom', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
];

const GROUP_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'group.name', label: 'Name', i18nKey: 'setting.report.field.groupTableName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 25 },
  { key: 'group.description', label: 'Beschreibung', i18nKey: 'setting.report.field.groupDescription', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 25 },
  { key: 'group.validFrom', label: 'Gültig ab', i18nKey: 'setting.report.field.groupValidFrom', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'group.validUntil', label: 'Gültig bis', i18nKey: 'setting.report.field.groupValidUntil', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'group.clientsCount', label: 'Adressen', i18nKey: 'setting.report.field.groupClientsCount', type: ReportFieldType.Number, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'group.shiftsCount', label: 'Schichten', i18nKey: 'setting.report.field.groupShiftsCount', type: ReportFieldType.Number, category: FieldCategory.WorkTable, defaultWidth: 10 },
];

const GROUP_FOOTER_FIELDS: DataBindingDefinition[] = [
  { key: 'group.totalCount', label: 'Anzahl Gruppen', i18nKey: 'setting.report.field.groupTotalCount', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
];

const SHIFT_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'shift.name', label: 'Name', i18nKey: 'setting.report.field.shiftName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'shift.abbreviation', label: 'Abkürzung', i18nKey: 'setting.report.field.shiftAbbreviation', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'shift.startShift', label: 'Von', i18nKey: 'setting.report.field.shiftStartShift', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'shift.endShift', label: 'Bis', i18nKey: 'setting.report.field.shiftEndShift', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'shift.fromDate', label: 'Gültig ab', i18nKey: 'setting.report.field.shiftFromDate', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'shift.untilDate', label: 'Gültig bis', i18nKey: 'setting.report.field.shiftUntilDate', type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15 },
  { key: 'shift.workTime', label: 'Arbeitszeit', i18nKey: 'setting.report.field.shiftWorkTime', type: ReportFieldType.Number, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'shift.description', label: 'Beschreibung', i18nKey: 'setting.report.field.shiftDescription', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 25 },
];

const SHIFT_FOOTER_FIELDS: DataBindingDefinition[] = [
  { key: 'shift.totalCount', label: 'Anzahl Schichten', i18nKey: 'setting.report.field.shiftTotalCount', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
];

const CONTAINER_TEMPLATE_TABLE_FIELDS: DataBindingDefinition[] = [
  { key: 'ct.weekday', label: 'Wochentag', i18nKey: 'setting.report.field.ctWeekday', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'ct.fromTime', label: 'Von', i18nKey: 'setting.report.field.ctFromTime', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'ct.untilTime', label: 'Bis', i18nKey: 'setting.report.field.ctUntilTime', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'ct.shiftName', label: 'Schicht', i18nKey: 'setting.report.field.ctShiftName', type: ReportFieldType.Text, category: FieldCategory.WorkTable, defaultWidth: 20 },
  { key: 'ct.briefingTime', label: 'Briefing', i18nKey: 'setting.report.field.ctBriefingTime', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'ct.debriefingTime', label: 'Debriefing', i18nKey: 'setting.report.field.ctDebriefingTime', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 10 },
  { key: 'ct.travelTimeBefore', label: 'Fahrzeit vor', i18nKey: 'setting.report.field.ctTravelTimeBefore', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 12 },
  { key: 'ct.travelTimeAfter', label: 'Fahrzeit nach', i18nKey: 'setting.report.field.ctTravelTimeAfter', type: ReportFieldType.Time, category: FieldCategory.WorkTable, defaultWidth: 12 },
];

const CONTAINER_TEMPLATE_FOOTER_FIELDS: DataBindingDefinition[] = [
  { key: 'ct.totalCount', label: 'Anzahl Einträge', i18nKey: 'setting.report.field.ctTotalCount', type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25 },
];

const COMMON_FOOTER_FIELDS: DataBindingDefinition[] = [
  { key: 'report.pageNumber', label: 'Seitenzahl', i18nKey: 'setting.report.field.pageNumber', type: ReportFieldType.PageNumber, category: FieldCategory.Footer, defaultWidth: 25 },
  { key: 'report.signature', label: 'Unterschrift', i18nKey: 'setting.report.field.signature', type: ReportFieldType.Signature, category: FieldCategory.Footer, defaultWidth: 50 },
];

export const PAGE_LAYOUT_FIELD_KEYS: readonly string[] = COMMON_FOOTER_FIELDS.map(f => f.key);

export const REPORT_DATA_SOURCES: ReportDataSource[] = [
  {
    id: 'schedule',
    path: 'workplace/schedule',
    i18nKey: 'setting.report.source.schedule',
    multiSelect: true,
    dataSets: [
      {
        id: 'work',
        i18nKey: 'setting.report.dataset.work',
        headerFields: [...CLIENT_HEADER_FIELDS, ...COMMON_HEADER_FIELDS],
        tableFields: WORK_TABLE_FIELDS,
        footerFields: [
          FOOTER_FIELDS.find(f => f.key === 'sum.hours')!,
          FOOTER_FIELDS.find(f => f.key === 'sum.surcharges')!,
          FOOTER_FIELDS.find(f => f.key === 'sum.workDays')!,
          ...COMMON_FOOTER_FIELDS,
        ],
      },
      {
        id: 'workChange',
        i18nKey: 'setting.report.dataset.workChange',
        headerFields: [...CLIENT_HEADER_FIELDS, ...COMMON_HEADER_FIELDS],
        tableFields: WORK_TABLE_FIELDS,
        footerFields: [
          FOOTER_FIELDS.find(f => f.key === 'sum.hours')!,
          FOOTER_FIELDS.find(f => f.key === 'sum.surcharges')!,
          ...COMMON_FOOTER_FIELDS,
        ],
      },
      {
        id: 'break',
        i18nKey: 'setting.report.dataset.break',
        headerFields: [...CLIENT_HEADER_FIELDS, ...COMMON_HEADER_FIELDS],
        tableFields: WORK_TABLE_FIELDS,
        footerFields: [
          FOOTER_FIELDS.find(f => f.key === 'sum.hours')!,
          ...COMMON_FOOTER_FIELDS,
        ],
      },
      {
        id: 'expenses',
        i18nKey: 'setting.report.dataset.expenses',
        headerFields: [...CLIENT_HEADER_FIELDS, ...COMMON_HEADER_FIELDS],
        tableFields: EXPENSES_TABLE_FIELDS,
        footerFields: [
          FOOTER_FIELDS.find(f => f.key === 'sum.expenses')!,
          ...COMMON_FOOTER_FIELDS,
        ],
      },
    ],
  },
  {
    id: 'absence-gantt',
    path: 'workplace/absence-gantt',
    i18nKey: 'setting.report.source.absenceGantt',
    dataSets: [
      {
        id: 'absences',
        i18nKey: 'setting.report.dataset.absences',
        headerFields: [...CLIENT_HEADER_FIELDS, ...COMMON_HEADER_FIELDS],
        tableFields: ABSENCE_TABLE_FIELDS,
        footerFields: [...ABSENCE_FOOTER_FIELDS, ...COMMON_FOOTER_FIELDS],
      },
    ],
  },
  {
    id: 'all-address',
    path: 'workplace/address/all-address',
    i18nKey: 'setting.report.source.allAddress',
    dataSets: [
      {
        id: 'clients',
        i18nKey: 'setting.report.dataset.clients',
        headerFields: [...COMMON_HEADER_FIELDS],
        tableFields: CLIENT_LIST_TABLE_FIELDS,
        footerFields: [...CLIENT_LIST_FOOTER_FIELDS, ...COMMON_FOOTER_FIELDS],
      },
    ],
  },
  {
    id: 'edit-address',
    path: 'workplace/address/edit-address',
    i18nKey: 'setting.report.source.editAddress',
    dataSets: [
      {
        id: 'details',
        i18nKey: 'setting.report.dataset.addressDetails',
        headerFields: [...CLIENT_HEADER_FIELDS, ...COMMON_HEADER_FIELDS],
        tableFields: ADDRESS_DETAIL_TABLE_FIELDS,
        footerFields: [...COMMON_FOOTER_FIELDS],
      },
    ],
  },
  {
    id: 'group',
    path: 'workplace/group',
    i18nKey: 'setting.report.source.group',
    dataSets: [
      {
        id: 'groups',
        i18nKey: 'setting.report.dataset.groups',
        headerFields: [...COMMON_HEADER_FIELDS],
        tableFields: GROUP_TABLE_FIELDS,
        footerFields: [...GROUP_FOOTER_FIELDS, ...COMMON_FOOTER_FIELDS],
      },
    ],
  },
  {
    id: 'shift-table',
    path: 'workplace/shift/all-shift/shift-table',
    i18nKey: 'setting.report.source.shiftTable',
    dataSets: [
      {
        id: 'shifts',
        i18nKey: 'setting.report.dataset.shifts',
        headerFields: [...COMMON_HEADER_FIELDS],
        tableFields: SHIFT_TABLE_FIELDS,
        footerFields: [...SHIFT_FOOTER_FIELDS, ...COMMON_FOOTER_FIELDS],
      },
    ],
  },
  {
    id: 'container-template',
    path: 'workplace/shift/container-template',
    i18nKey: 'setting.report.source.containerTemplate',
    dataSets: [
      {
        id: 'items',
        i18nKey: 'setting.report.dataset.containerItems',
        headerFields: [...COMMON_HEADER_FIELDS],
        tableFields: CONTAINER_TEMPLATE_TABLE_FIELDS,
        footerFields: [...CONTAINER_TEMPLATE_FOOTER_FIELDS, ...COMMON_FOOTER_FIELDS],
      },
    ],
  },
];

export function getDataSource(sourceId: string): ReportDataSource | undefined {
  return REPORT_DATA_SOURCES.find(s => s.id === sourceId);
}

export function getDataSet(sourceId: string, dataSetId: string): ReportDataSet | undefined {
  const source = getDataSource(sourceId);
  return source?.dataSets.find(ds => ds.id === dataSetId);
}

export function getAllFieldsForDataSet(sourceId: string, dataSetId: string): DataBindingDefinition[] {
  const ds = getDataSet(sourceId, dataSetId);
  if (!ds) return [];
  return [...ds.headerFields, ...ds.tableFields, ...ds.footerFields];
}

export function getAllFieldsForDataSets(sourceId: string, dataSetIds: string[]): DataBindingDefinition[] {
  const source = getDataSource(sourceId);
  if (!source) return [];
  const fieldMap = new Map<string, DataBindingDefinition>();
  for (const dsId of dataSetIds) {
    const ds = source.dataSets.find(d => d.id === dsId);
    if (!ds) continue;
    for (const f of [...ds.headerFields, ...ds.tableFields, ...ds.footerFields]) {
      if (!fieldMap.has(f.key)) fieldMap.set(f.key, f);
    }
  }
  return Array.from(fieldMap.values());
}

export function getFieldPrefixMap(
  sourceId: string,
  dataSetIds: string[],
  translateFn: (key: string) => string
): Map<string, string> {
  if (dataSetIds.length <= 1) return new Map();

  const source = getDataSource(sourceId);
  if (!source) return new Map();

  const entries: { key: string; fieldI18nKey: string; dsI18nKey: string }[] = [];
  const seen = new Set<string>();

  for (const dsId of dataSetIds) {
    const ds = source.dataSets.find(d => d.id === dsId);
    if (!ds) continue;
    for (const f of [...ds.tableFields, ...ds.footerFields]) {
      if (!seen.has(f.key)) {
        seen.add(f.key);
        entries.push({ key: f.key, fieldI18nKey: f.i18nKey, dsI18nKey: ds.i18nKey });
      }
    }
  }

  const labelGroups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const label = translateFn(entry.fieldI18nKey);
    if (!labelGroups.has(label)) labelGroups.set(label, []);
    labelGroups.get(label)!.push(entry);
  }

  const prefixMap = new Map<string, string>();
  for (const [, group] of labelGroups) {
    if (group.length > 1) {
      for (const e of group) {
        prefixMap.set(e.key, translateFn(e.dsI18nKey));
      }
    }
  }

  return prefixMap;
}
