// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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

export class ScheduleExpensesTestData {
  amount = 100;
  taxable = true;
  description = '';

  static metadata: PropertyMetadata = {
    amount: { min: 0, max: 100000, decimals: 2, step: 1 },
  };
}

export class AbsenceTestData {
  fromDate = '2025-01-01';
  untilDate = '2025-01-05';
  absenceName = 'Ferien';
  defaultValue = 1;
  clientName = 'Muster';
  clientFirstName = 'Max';

  static metadata: PropertyMetadata = {
    defaultValue: { min: 0, max: 100, decimals: 2 },
  };
}

export class ClientTestData {
  idNumber = 1001;
  name = 'Muster';
  firstName = 'Max';
  company = 'Firma AG';
  birthdate = '1990-01-15';
  gender = 0;

  static metadata: PropertyMetadata = {
    idNumber: { min: 0, max: 999999, decimals: 0 },
    gender: { min: 0, max: 1, decimals: 0 },
  };
}

export class GroupTestData {
  name = 'Gruppe A';
  parentName = '';
}

export class ScheduleFooterTestData {
  totalRows = 20;
  totalHours = 160;
  totalSurcharges = 10;
  totalWorkDays = 20;
  totalExpenses = 500;

  static metadata: PropertyMetadata = {
    totalRows: { min: 0, max: 10000, decimals: 0 },
    totalHours: { min: 0, max: 10000, decimals: 2 },
    totalSurcharges: { min: 0, max: 10000, decimals: 2 },
    totalWorkDays: { min: 0, max: 365, decimals: 0 },
    totalExpenses: { min: 0, max: 1000000, decimals: 2 },
  };
}

export class AbsenceFooterTestData {
  totalRows = 10;

  static metadata: PropertyMetadata = {
    totalRows: { min: 0, max: 10000, decimals: 0 },
  };
}

export class ClientFooterTestData {
  totalRows = 50;

  static metadata: PropertyMetadata = {
    totalRows: { min: 0, max: 10000, decimals: 0 },
  };
}

export class GroupFooterTestData {
  totalRows = 5;

  static metadata: PropertyMetadata = {
    totalRows: { min: 0, max: 10000, decimals: 0 },
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
