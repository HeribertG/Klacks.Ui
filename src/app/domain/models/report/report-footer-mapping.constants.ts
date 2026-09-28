// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export const FOOTER_TO_COLUMN_MAP: Record<string, string> = {
  'sum.hours': 'entry.hours',
  'sum.surcharges': 'entry.surcharges',
  'sum.workDays': 'entry.date',
  'sum.expenses': 'expense.amount',
  'absence.totalCount': 'absence.absenceName',
  'absence.totalValue': 'absence.value',
  'client.totalCount': 'client.list.name',
  'group.totalCount': 'group.name',
  'shift.totalCount': 'shift.name',
  'ct.totalCount': 'ct.shiftName',
};
