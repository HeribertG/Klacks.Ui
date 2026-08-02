// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Selects the rows that belong to a table section of a schedule report.
 * Expenses and working time come from the same fetch, so a section has to pick its own kind;
 * without this an expenses sheet would also list working hours and vice versa.
 * @param section - Section the rows are selected for
 * @param rows - Rows fetched for the report
 * @param sourceId - Data source of the template; only the schedule source mixes entry types
 */

import { ReportSection, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

const SCHEDULE_SOURCE_ID = 'schedule';
const EXPENSE_BINDING_PREFIX = 'expense.';

export function selectRowsForSection<T extends { entryType?: number }>(
  section: ReportSection,
  rows: T[],
  sourceId: string | undefined
): T[] {
  if (sourceId !== SCHEDULE_SOURCE_ID) {
    return rows;
  }

  const wantsExpenses = section.type === ReportSectionType.ExpensesTable
    || section.fields.some(field => field.dataBinding?.startsWith(EXPENSE_BINDING_PREFIX));

  return wantsExpenses
    ? rows.filter(row => row.entryType === WorkScheduleEntryType.Expenses)
    : rows.filter(row => row.entryType !== WorkScheduleEntryType.Expenses);
}
