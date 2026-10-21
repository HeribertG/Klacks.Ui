// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScheduleExpensesTestData } from './schedule-expenses-test-data.model';
import { AbsenceTestData } from './absence-test-data.model';
import { ClientTestData } from './client-test-data.model';
import { GroupTestData } from './group-test-data.model';
import { ScheduleFooterTestData } from './schedule-footer-test-data.model';
import { AbsenceFooterTestData } from './absence-footer-test-data.model';
import { ClientFooterTestData } from './client-footer-test-data.model';
import { GroupFooterTestData } from './group-footer-test-data.model';
import { PropertyMetadata } from '../shift/shift-data-class';

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

/* eslint-disable @typescript-eslint/no-explicit-any */
export function createFormulaTestData(sourceId: string, dataSetIds: string[]): any {
  switch (sourceId) {
    case 'schedule': {
      if (dataSetIds.includes('expenses')) return new ScheduleExpensesTestData();
      return new ScheduleWorkTestData();
    }
    case 'absence-gantt': return new AbsenceTestData();
    case 'all-address': return new ClientTestData();
    case 'group': return new GroupTestData();
    default: return new ScheduleWorkTestData();
  }
}

export function createFooterFormulaTestData(sourceId: string): any {
  switch (sourceId) {
    case 'schedule': return new ScheduleFooterTestData();
    case 'absence-gantt': return new AbsenceFooterTestData();
    case 'all-address': return new ClientFooterTestData();
    case 'group': return new GroupFooterTestData();
    default: return new ScheduleFooterTestData();
  }
}
