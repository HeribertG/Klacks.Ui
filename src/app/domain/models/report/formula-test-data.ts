// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScheduleExpensesTestData } from './schedule-expenses-test-data.model';
import { AbsenceTestData } from './absence-test-data.model';
import { ClientTestData } from './client-test-data.model';
import { GroupTestData } from './group-test-data.model';
import { ScheduleFooterTestData } from './schedule-footer-test-data.model';
import { AbsenceFooterTestData } from './absence-footer-test-data.model';
import { ClientFooterTestData } from './client-footer-test-data.model';
import { GroupFooterTestData } from './group-footer-test-data.model';
import { PropertyMetadata } from '../shift/property-metadata.type';

export class ScheduleWorkTestData {
  hours = 8;
  surcharges = 0;
  startTime = '08:00';
  endTime = '17:00';
  weekday = 1;
  entryType = 0;
  information = '';

  static metadata: PropertyMetadata = {
    hours: { min: 0, max: 24, decimals: 2, step: 0.25 },
    surcharges: { min: 0, max: 24, decimals: 2, step: 0.25 },
    weekday: { min: 0, max: 6, decimals: 0 },
    entryType: { min: 0, max: 4, decimals: 0 },
  };
}

export type FormulaTestData = Record<string, unknown>;

function asFormulaTestData(data: object): FormulaTestData {
  return data as FormulaTestData;
}

export function createFormulaTestData(sourceId: string, dataSetIds: string[]): FormulaTestData {
  switch (sourceId) {
    case 'schedule': {
      if (dataSetIds.includes('expenses')) return asFormulaTestData(new ScheduleExpensesTestData());
      return asFormulaTestData(new ScheduleWorkTestData());
    }
    case 'absence-gantt': return asFormulaTestData(new AbsenceTestData());
    case 'all-address': return asFormulaTestData(new ClientTestData());
    case 'group': return asFormulaTestData(new GroupTestData());
    default: return asFormulaTestData(new ScheduleWorkTestData());
  }
}

export function createFooterFormulaTestData(sourceId: string): FormulaTestData {
  switch (sourceId) {
    case 'schedule': return asFormulaTestData(new ScheduleFooterTestData());
    case 'absence-gantt': return asFormulaTestData(new AbsenceFooterTestData());
    case 'all-address': return asFormulaTestData(new ClientFooterTestData());
    case 'group': return asFormulaTestData(new GroupFooterTestData());
    default: return asFormulaTestData(new ScheduleFooterTestData());
  }
}
