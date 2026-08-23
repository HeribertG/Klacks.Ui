// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface FormulaVariableDefinition {
  name: string;
  i18nKey: string;
  type: 'number' | 'string' | 'boolean' | 'date';
}

const SHIFT_FORMULA_VARIABLES: FormulaVariableDefinition[] = [
  { name: 'name', i18nKey: 'setting.report.field.shiftName', type: 'string' },
  { name: 'abbreviation', i18nKey: 'setting.report.field.shiftAbbreviation', type: 'string' },
  { name: 'workTime', i18nKey: 'setting.report.field.shiftWorkTime', type: 'number' },
  { name: 'startShift', i18nKey: 'setting.report.field.shiftStartShift', type: 'string' },
  { name: 'endShift', i18nKey: 'setting.report.field.shiftEndShift', type: 'string' },
];

const SHIFT_FOOTER_FORMULA_VARIABLES: FormulaVariableDefinition[] = [
  { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
  { name: 'totalWorkTime', i18nKey: 'setting.report.formula.var.totalWorkTime', type: 'number' },
];

export const FORMULA_VARIABLES: Record<string, Record<string, FormulaVariableDefinition[]>> = {
  'schedule': {
    'work': [
      { name: 'hours', i18nKey: 'setting.report.field.entryHours', type: 'number' },
      { name: 'surcharges', i18nKey: 'setting.report.field.entrySurcharges', type: 'number' },
      { name: 'startTime', i18nKey: 'setting.report.field.entryStartTime', type: 'string' },
      { name: 'endTime', i18nKey: 'setting.report.field.entryEndTime', type: 'string' },
      { name: 'weekday', i18nKey: 'setting.report.field.entryWeekday', type: 'number' },
      { name: 'entryType', i18nKey: 'setting.report.field.entryType', type: 'number' },
      { name: 'information', i18nKey: 'setting.report.field.entryInformation', type: 'string' },
    ],
    'workChange': [
      { name: 'hours', i18nKey: 'setting.report.field.entryHours', type: 'number' },
      { name: 'surcharges', i18nKey: 'setting.report.field.entrySurcharges', type: 'number' },
      { name: 'startTime', i18nKey: 'setting.report.field.entryStartTime', type: 'string' },
      { name: 'endTime', i18nKey: 'setting.report.field.entryEndTime', type: 'string' },
      { name: 'weekday', i18nKey: 'setting.report.field.entryWeekday', type: 'number' },
      { name: 'entryType', i18nKey: 'setting.report.field.entryType', type: 'number' },
      { name: 'information', i18nKey: 'setting.report.field.entryInformation', type: 'string' },
    ],
    'expenses': [
      { name: 'amount', i18nKey: 'setting.report.field.expenseAmount', type: 'number' },
      { name: 'taxable', i18nKey: 'setting.report.field.expenseTaxable', type: 'boolean' },
      { name: 'description', i18nKey: 'setting.report.field.expenseDescription', type: 'string' },
    ],
  },
  'absence-gantt': {
    'absences': [
      { name: 'fromDate', i18nKey: 'setting.report.formula.var.from', type: 'string' },
      { name: 'untilDate', i18nKey: 'setting.report.formula.var.until', type: 'string' },
      { name: 'absenceName', i18nKey: 'setting.report.formula.var.absenceName', type: 'string' },
      { name: 'defaultValue', i18nKey: 'setting.report.formula.var.defaultValue', type: 'number' },
      { name: 'clientName', i18nKey: 'setting.report.field.clientName', type: 'string' },
      { name: 'clientFirstName', i18nKey: 'setting.report.field.clientFirstName', type: 'string' },
    ],
  },
  'all-address': {
    'clients': [
      { name: 'idNumber', i18nKey: 'setting.report.field.clientIdNumber', type: 'number' },
      { name: 'name', i18nKey: 'setting.report.field.clientName', type: 'string' },
      { name: 'firstName', i18nKey: 'setting.report.field.clientFirstName', type: 'string' },
      { name: 'company', i18nKey: 'setting.report.field.clientCompany', type: 'string' },
      { name: 'birthdate', i18nKey: 'setting.report.formula.var.birthdate', type: 'string' },
      { name: 'gender', i18nKey: 'setting.report.formula.var.gender', type: 'number' },
    ],
  },
  'group': {
    'groups': [
      { name: 'name', i18nKey: 'setting.report.formula.var.groupName', type: 'string' },
      { name: 'parentName', i18nKey: 'setting.report.formula.var.parentName', type: 'string' },
    ],
  },
  'edit-address': {
    'details': [
      { name: 'type', i18nKey: 'setting.report.field.addressType', type: 'number' },
      { name: 'zip', i18nKey: 'setting.report.field.addressZip', type: 'string' },
      { name: 'city', i18nKey: 'setting.report.field.addressCity', type: 'string' },
      { name: 'country', i18nKey: 'setting.report.field.addressCountry', type: 'string' },
      { name: 'validFrom', i18nKey: 'setting.report.field.addressValidFrom', type: 'string' },
    ],
  },
  'edit-group': {
    'details': [
      { name: 'idNumber', i18nKey: 'setting.report.field.groupMemberIdNumber', type: 'number' },
      { name: 'company', i18nKey: 'setting.report.field.groupMemberCompany', type: 'string' },
      { name: 'firstName', i18nKey: 'setting.report.field.groupMemberFirstName', type: 'string' },
      { name: 'name', i18nKey: 'setting.report.field.groupMemberName', type: 'string' },
    ],
  },
  'shift-table': { 'shifts': SHIFT_FORMULA_VARIABLES },
  'shift-table-cut': { 'shifts': SHIFT_FORMULA_VARIABLES },
  'shift-table-container': { 'shifts': SHIFT_FORMULA_VARIABLES },
};

export const FOOTER_FORMULA_VARIABLES: Record<string, Record<string, FormulaVariableDefinition[]>> = {
  'schedule': {
    'work': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
      { name: 'totalHours', i18nKey: 'setting.report.formula.var.totalHours', type: 'number' },
      { name: 'totalSurcharges', i18nKey: 'setting.report.formula.var.totalSurcharges', type: 'number' },
      { name: 'totalWorkDays', i18nKey: 'setting.report.formula.var.totalWorkDays', type: 'number' },
    ],
    'workChange': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
      { name: 'totalHours', i18nKey: 'setting.report.formula.var.totalHours', type: 'number' },
      { name: 'totalSurcharges', i18nKey: 'setting.report.formula.var.totalSurcharges', type: 'number' },
    ],
    'expenses': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
      { name: 'totalExpenses', i18nKey: 'setting.report.formula.var.totalExpenses', type: 'number' },
    ],
  },
  'absence-gantt': {
    'absences': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
      { name: 'totalValue', i18nKey: 'setting.report.formula.var.totalValue', type: 'number' },
    ],
  },
  'all-address': {
    'clients': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
    ],
  },
  'group': {
    'groups': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
    ],
  },
  'edit-address': {
    'details': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
    ],
  },
  'edit-group': {
    'details': [
      { name: 'totalRows', i18nKey: 'setting.report.formula.var.totalRows', type: 'number' },
    ],
  },
  'shift-table': { 'shifts': SHIFT_FOOTER_FORMULA_VARIABLES },
  'shift-table-cut': { 'shifts': SHIFT_FOOTER_FORMULA_VARIABLES },
  'shift-table-container': { 'shifts': SHIFT_FOOTER_FORMULA_VARIABLES },
};

export function getFormulaVariables(sourceId: string, dataSetIds: string[]): FormulaVariableDefinition[] {
  const sourceVars = FORMULA_VARIABLES[sourceId];
  if (!sourceVars) return [];

  const seen = new Set<string>();
  const result: FormulaVariableDefinition[] = [];

  for (const dsId of dataSetIds) {
    const vars = sourceVars[dsId];
    if (!vars) continue;
    for (const v of vars) {
      if (!seen.has(v.name)) {
        seen.add(v.name);
        result.push(v);
      }
    }
  }

  return result;
}

export function getFooterFormulaVariables(sourceId: string, dataSetIds: string[]): FormulaVariableDefinition[] {
  const sourceVars = FOOTER_FORMULA_VARIABLES[sourceId];
  if (!sourceVars) return [];

  const seen = new Set<string>();
  const result: FormulaVariableDefinition[] = [];

  for (const dsId of dataSetIds) {
    const vars = sourceVars[dsId];
    if (!vars) continue;
    for (const v of vars) {
      if (!seen.has(v.name)) {
        seen.add(v.name);
        result.push(v);
      }
    }
  }

  return result;
}
