// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { selectRowsForSection } from './report-section-rows.helper';
import { ReportSection, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { DEFAULT_FIELD_STYLE, ReportFieldType } from 'src/app/domain/models/report/report-field.model';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

function section(partial: Partial<ReportSection>): ReportSection {
  return {
    type: ReportSectionType.WorkTable,
    visible: true,
    sortOrder: 1,
    fields: [],
    ...partial,
  };
}

function field(dataBinding: string) {
  return {
    name: dataBinding,
    dataBinding,
    type: ReportFieldType.Text,
    width: 10,
    height: 0,
    sortOrder: 0,
    style: { ...DEFAULT_FIELD_STYLE },
  };
}

const rows = [
  { id: 'work', entryType: WorkScheduleEntryType.Work },
  { id: 'expense', entryType: WorkScheduleEntryType.Expenses },
  { id: 'break', entryType: WorkScheduleEntryType.Break },
];

describe('selectRowsForSection', () => {
  it('gives a work table everything except expenses', () => {
    const result = selectRowsForSection(section({ fields: [field('entry.hours')] }), rows, 'schedule');

    expect(result.map(r => r.id)).toEqual(['work', 'break']);
  });

  it('gives an expenses table only expenses, recognised by the section type', () => {
    const result = selectRowsForSection(section({ type: ReportSectionType.ExpensesTable }), rows, 'schedule');

    expect(result.map(r => r.id)).toEqual(['expense']);
  });

  it('recognises an expenses table by its fields as well', () => {
    const result = selectRowsForSection(section({ fields: [field('expense.amount')] }), rows, 'schedule');

    expect(result.map(r => r.id)).toEqual(['expense']);
  });

  it('leaves other data sources untouched, they have no entry types', () => {
    const result = selectRowsForSection(section({ fields: [field('client.name')] }), rows, 'all-address');

    expect(result.length).toBe(rows.length);
  });
});
