// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { ReportXlsxService } from './report-xlsx.service';
import { ReportDataProvider } from './report-data-provider.service';
import { DEFAULT_PAGE_SETUP, ReportTemplate, ReportType } from 'src/app/domain/models/report/report-template.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { DEFAULT_FIELD_STYLE, ReportField, ReportFieldType } from 'src/app/domain/models/report/report-field.model';

function field(partial: Partial<ReportField>): ReportField {
  return {
    name: 'F',
    dataBinding: 'entry.x',
    type: ReportFieldType.Text,
    width: 20,
    height: 0,
    sortOrder: 0,
    style: { ...DEFAULT_FIELD_STYLE },
    ...partial,
  };
}

function buildTemplate(fields: ReportField[], extra: Record<string, unknown> = {}): ReportTemplate {
  return {
    name: 'Stundenrapport Mai',
    description: '',
    type: ReportType.Schedule,
    sourceId: 'schedule',
    dataSetIds: ['work'],
    pageSetup: { ...DEFAULT_PAGE_SETUP },
    sections: [
      {
        type: ReportSectionType.WorkTable,
        visible: true,
        sortOrder: 1,
        fields,
        title: 'Arbeit',
        ...extra,
      },
    ],
  };
}

const provider: ReportDataProvider = {
  fetchData: () => Promise.resolve({ rows: [] }),
  resolveFieldValue: (f, row) => String(row[f.dataBinding] ?? ''),
  resolveHeaderValue: () => '',
  resolveFooterValue: () => '',
  buildFormulaVariables: (row) => ({ hours: row['entry.hours'] }),
};

describe('ReportXlsxService', () => {
  let service: ReportXlsxService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    service = TestBed.inject(ReportXlsxService);
  });

  it('derives a usable file name from the template name', () => {
    expect(service.buildFileName(buildTemplate([]))).toBe('stundenrapport-mai');
    expect(service.buildFileName({ ...buildTemplate([]), name: '///' })).toBe('report');
  });

  it('maps the columns with their field type so the server can type the cells', () => {
    const template = buildTemplate([
      field({ dataBinding: 'entry.date', name: 'Datum', type: ReportFieldType.Date, sortOrder: 0 }),
      field({ dataBinding: 'entry.hours', name: 'Stunden', type: ReportFieldType.Number, sortOrder: 1 }),
    ]);

    const request = service.buildRequest(template, provider, { rows: [] });

    expect(request.sheets.length).toBe(1);
    expect(request.sheets[0].columns.map(c => c.type)).toEqual([ReportFieldType.Date, ReportFieldType.Number]);
  });

  it('resolves the rows through the provider, in column order', () => {
    const template = buildTemplate([
      field({ dataBinding: 'entry.date', sortOrder: 0 }),
      field({ dataBinding: 'entry.hours', type: ReportFieldType.Number, sortOrder: 1 }),
    ]);

    const request = service.buildRequest(template, provider, {
      rows: [{ 'entry.date': '12.05.2026', 'entry.hours': '8.50' }],
    });

    expect(request.sheets[0].rows).toEqual([['12.05.2026', '8.50']]);
  });

  it('reports the grouping column and whether subtotals were asked for', () => {
    const template = buildTemplate(
      [
        field({ dataBinding: 'entry.shiftName', sortOrder: 0 }),
        field({ dataBinding: 'entry.hours', type: ReportFieldType.Number, sortOrder: 1 }),
      ],
      { groupBy: 'entry.shiftName', groupSubtotals: true }
    );

    const request = service.buildRequest(template, provider, { rows: [] });

    expect(request.sheets[0].groupColumnIndex).toBe(0);
    expect(request.sheets[0].subtotals).toBe(true);
  });

  it('does not ask for subtotals when the grouping column is not among the columns', () => {
    const template = buildTemplate([field({ dataBinding: 'entry.hours', sortOrder: 0 })], {
      groupBy: 'entry.gone',
      groupSubtotals: true,
    });

    const request = service.buildRequest(template, provider, { rows: [] });

    expect(request.sheets[0].groupColumnIndex).toBeUndefined();
    expect(request.sheets[0].subtotals).toBe(false);
  });

  it('applies the row filter, so the sheet shows what the PDF shows', () => {
    const template = buildTemplate([field({ dataBinding: 'entry.hours', type: ReportFieldType.Number, sortOrder: 0 })], {
      rowFilter: 'output 1, hours > 7',
    });

    const request = service.buildRequest(template, provider, {
      rows: [{ 'entry.hours': '8' }, { 'entry.hours': '6' }],
    });

    expect(request.sheets[0].rows).toEqual([['8']]);
  });

  it('keeps every row when the filter expression is broken, instead of emptying the sheet', () => {
    const template = buildTemplate([field({ dataBinding: 'entry.hours', type: ReportFieldType.Number, sortOrder: 0 })], {
      rowFilter: 'das ist keine formel',
    });

    const request = service.buildRequest(template, provider, {
      rows: [{ 'entry.hours': '8' }, { 'entry.hours': '6' }],
    });

    expect(request.sheets[0].rows).toEqual([['8'], ['6']]);
  });

  it('skips header and footer sections', () => {
    const template = buildTemplate([field({ sortOrder: 0 })]);
    template.sections.push(
      { type: ReportSectionType.Header, visible: true, sortOrder: 0, fields: [field({ sortOrder: 0 })] },
      { type: ReportSectionType.Footer, visible: true, sortOrder: 9, fields: [field({ sortOrder: 0 })] }
    );

    const request = service.buildRequest(template, provider, { rows: [] });

    expect(request.sheets.length).toBe(1);
  });
});
