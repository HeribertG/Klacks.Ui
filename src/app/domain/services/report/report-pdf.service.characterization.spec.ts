// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import { environment } from 'src/environments/environment';

import { ReportPdfService } from './report-pdf.service';
import { FormulaEvaluationService } from './formula-evaluation.service';
import { ReportFontService } from './report-font.service';
import { PdfUnicodeTextService } from './pdf-unicode-text.service';
import { ReportRowFilterService } from './report-row-filter.service';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportData } from './report-data.interface';
import { ReportGenerationContext } from './report-generation-context.interface';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { FieldStyle } from 'src/app/domain/models/report/field-style.interface';
import { ReportFieldType } from 'src/app/domain/models/report/report-field-type.enum';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { ReportType } from 'src/app/domain/models/report/report-type.enum';
import { ReportPageSize } from 'src/app/domain/models/report/report-page-size.enum';
import { ReportOrientation } from 'src/app/domain/models/report/report-orientation.enum';
import { BorderLineStyle } from 'src/app/domain/models/report/border-line-style.enum';
import { ReportParameterType } from 'src/app/domain/models/report/report-parameter-type.enum';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

type LogEntry = unknown[];

interface CapturedTable {
  settings: { startY: number; margin: { left: number }; tableWidth: number; showFoot: string; theme: string };
  styles: Record<string, unknown>;
  hooks: { didDrawCell: unknown[] };
  columns: { raw: unknown }[];
  body: { raw: unknown; cells: Record<number, { x: number; y: number; width: number; height: number; styles: Record<string, unknown> }> }[];
  foot: { raw: unknown }[];
  finalY: number;
}

const RECORDED_METHODS = [
  'text', 'line', 'addImage', 'addPage', 'setPage', 'setFont', 'setFontSize',
  'setTextColor', 'setDrawColor', 'setLineWidth', 'setLineDashPattern',
];
const PRECISION = 1000;
const MARGINS = { top: 20, bottom: 15, left: 10, right: 12 };

function round(value: unknown): unknown {
  if (typeof value === 'number') return Math.round(value * PRECISION) / PRECISION;
  if (Array.isArray(value)) return value.map(round);
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, round(entry)]));
  }
  return value;
}

function style(overrides: Partial<FieldStyle> = {}): FieldStyle {
  return {
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
    fontFamily: 'helvetica',
    alignment: TextAlignment.Left,
    textColor: '#000000',
    backgroundColor: '#FFFFFF',
    ...overrides,
  };
}

function makeField(overrides: Partial<ReportField> = {}): ReportField {
  return { name: '', dataBinding: '', type: ReportFieldType.Text, width: 30, height: 0, style: style(), sortOrder: 0, ...overrides };
}

function makeSection(type: ReportSectionType, fields: ReportField[], overrides: Partial<ReportSection> = {}): ReportSection {
  return { type, fields, visible: true, sortOrder: 0, ...overrides };
}

function makeTemplate(sections: ReportSection[], overrides: Partial<ReportTemplate> = {}): ReportTemplate {
  return {
    name: 'T',
    description: '',
    type: ReportType.Schedule,
    sourceId: 'test',
    dataSetIds: ['x'],
    pageSetup: { orientation: ReportOrientation.Portrait, size: ReportPageSize.A4, margins: { ...MARGINS } },
    sections,
    ...overrides,
  };
}

function makeProvider(headerValues: Record<string, string> = {}): ReportDataProvider {
  return {
    fetchData: async () => ({ rows: [] }),
    resolveFieldValue: (f, row) => String((row as Record<string, unknown>)[f.dataBinding] ?? ''),
    resolveHeaderValue: vi.fn((f: ReportField) => headerValues[f.dataBinding] ?? ''),
    resolveFooterValue: (f, rows) => `F:${f.dataBinding}:${rows.length}`,
    buildFormulaVariables: (row) => ({ ...row }),
    buildFooterFormulaVariables: (rows) => ({ count: rows.length }),
    collectResolvedLabelTexts: () => ['label-a'],
  };
}

const measureDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const A4_WIDTH = measureDoc.internal.pageSize.getWidth();
const A4_HEIGHT = measureDoc.internal.pageSize.getHeight();
const CONTENT_WIDTH = A4_WIDTH - MARGINS.left - MARGINS.right;
const PAGE_RIGHT = A4_WIDTH - MARGINS.right;

function textWidth(text: string, fontSize = 10, fontStyle = 'normal'): number {
  measureDoc.setFontSize(fontSize);
  measureDoc.setFont('helvetica', fontStyle);
  return measureDoc.getTextWidth(text);
}

function indexOfRun(log: LogEntry[], run: LogEntry[]): number {
  for (let start = 0; start + run.length <= log.length; start++) {
    if (run.every((entry, offset) => JSON.stringify(log[start + offset]) === JSON.stringify(round(entry)))) {
      return start;
    }
  }
  return -1;
}

describe('ReportPdfService (characterization)', () => {
  let service: ReportPdfService;
  let log: LogEntry[];
  let tables: CapturedTable[];
  let documents: jsPDF[];
  let fontService: { registerFontsForTexts: ReturnType<typeof vi.fn>; resolveFontFamily: ReturnType<typeof vi.fn> };
  let unicodeText: { enableScriptShaping: ReturnType<typeof vi.fn> };
  let rowFilter: { filterRows: ReturnType<typeof vi.fn>; buildVariables: ReturnType<typeof vi.fn> };

  function capture(doc: jsPDF): void {
    documents.push(doc);
    const target = doc as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const name of RECORDED_METHODS) {
      const original = target[name].bind(doc);
      target[name] = (...args: unknown[]) => {
        log.push([name, ...args.map(round)]);
        return name === 'addImage' ? doc : original(...args);
      };
    }
    Object.defineProperty(doc, 'lastAutoTable', {
      configurable: true,
      get: () => tables[tables.length - 1] ?? false,
      set: (table: CapturedTable) => tables.push(table),
    });
  }

  function context(template: ReportTemplate, data: ReportData, overrides: Partial<ReportGenerationContext> = {}): ReportGenerationContext {
    return { template, provider: makeProvider(), data, groupName: 'Gruppe', ...overrides };
  }

  beforeEach(() => {
    log = [];
    tables = [];
    documents = [];
    fontService = {
      registerFontsForTexts: vi.fn(async (doc: jsPDF) => capture(doc)),
      resolveFontFamily: vi.fn((_doc: jsPDF, _text: string, preferred: string) => preferred),
    };
    unicodeText = { enableScriptShaping: vi.fn() };
    rowFilter = {
      filterRows: vi.fn((section: ReportSection, rows: object[]) => (section.rowFilter === 'none' ? [] : rows)),
      buildVariables: vi.fn((row: object) => ({ ...row })),
    };
    const formulaService = {
      compileFormula: vi.fn((formula: string) => ({ formula })),
      executeCompiled: vi.fn((compiled: { formula: string }, vars: Record<string, unknown>) => {
        if (compiled.formula === 'boom') throw new Error('boom');
        return `${compiled.formula}:${vars['n']}:${vars['param_p'] ?? ''}`;
      }),
      evaluateFormula: vi.fn((formula: string, vars: Record<string, unknown>) => {
        if (formula === 'boom') throw new Error('boom');
        if (formula === 'cond-hit') return vars['n'] === '7' ? ' TRUE ' : 'false';
        if (formula === 'cond-miss') return 'nope';
        return `ev:${formula}:${vars['count']}:${vars['param_p'] ?? ''}`;
      }),
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportPdfService,
        { provide: FormulaEvaluationService, useValue: formulaService },
        { provide: ReportFontService, useValue: fontService },
        { provide: PdfUnicodeTextService, useValue: unicodeText },
        { provide: ReportRowFilterService, useValue: rowFilter },
      ],
    });
    service = TestBed.inject(ReportPdfService);
  });

  afterEach(() => {
    document.documentElement.dir = '';
  });

  describe('document setup', () => {
    it('collects every render text and font family before drawing and enables script shaping', async () => {
      const header = makeSection(ReportSectionType.Header, [makeField({ name: 'Kopf', dataBinding: 'h', style: style({ fontFamily: 'NotoSans' }) })]);
      const body = makeSection(ReportSectionType.WorkTable, [makeField({ name: 'Spalte', dataBinding: 'c', style: style({ fontFamily: '' }) })], {
        title: 'Titel',
        sortOrder: 1,
        freeTextRows: [{ text: 'Frei', position: 'before', style: style() }],
        tableFooterFields: [makeField({ name: 'Fuss', dataBinding: 'ft', style: style({ fontFamily: 'times' }) })],
      });
      const template = makeTemplate([header, body], { name: 'Vorlage' });
      const data: ReportData = { rows: [{ c: 'x' }], metadata: { startDate: 'm' } };

      const blob = await service.generatePdf(context(template, data));

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(fontService.registerFontsForTexts).toHaveBeenCalledTimes(1);
      const [doc, texts, families] = fontService.registerFontsForTexts.mock.calls[0];
      expect(doc).toBe(documents[0]);
      expect(texts).toEqual([
        'Vorlage', 'Gruppe', '[{"c":"x"}]', '[]', '{"startDate":"m"}', 'label-a',
        'Kopf', 'Kopf',
        'Titel', 'Frei', 'Spalte', 'Spalte', 'Fuss', 'Fuss',
      ]);
      expect(families).toEqual(['NotoSans', 'times']);
      expect(unicodeText.enableScriptShaping).toHaveBeenCalledWith(documents[0]);
    });

    it('opens one page per client with only its rows and the period from the fetched metadata', async () => {
      const header = makeSection(ReportSectionType.Header, [makeField({ dataBinding: 'h' })]);
      const template = makeTemplate([header], {
        parameters: [{ key: 'p', label: 'P', type: ReportParameterType.Text, defaultValue: 'P1' }],
      });
      const provider = makeProvider({ h: 'Kopf' });
      const data: ReportData = {
        rows: [{ clientId: 'c1' }, { clientId: 'c2' }, { other: 1 }],
        clients: [{ id: 'c1' }, { id: 'c2' }],
        metadata: { startDate: 'meta-start' },
      };

      await service.generatePdf(context(template, data, { provider, startDate: 'ctx-start', endDate: 'ctx-end' }));

      expect(log.filter(entry => entry[0] === 'addPage')).toHaveLength(1);
      const contexts = (provider.resolveHeaderValue as ReturnType<typeof vi.fn>).mock.calls.map(call => call[1]);
      expect(contexts).toEqual([
        { client: { id: 'c1' }, groupName: 'Gruppe', startDate: 'meta-start', endDate: 'ctx-end', metadata: data.metadata },
        { client: { id: 'c2' }, groupName: 'Gruppe', startDate: 'meta-start', endDate: 'ctx-end', metadata: data.metadata },
      ]);
    });

    it('uses landscape geometry when the orientation is landscape', async () => {
      const footer = makeSection(ReportSectionType.Footer, [makeField({ dataBinding: 'sum.x', name: 'Summe' })]);
      const template = makeTemplate([footer], {
        pageSetup: { orientation: ReportOrientation.Landscape, size: ReportPageSize.A3, margins: { ...MARGINS } },
      });

      await service.generatePdf(context(template, { rows: [] }));

      expect(log).toContainEqual(['line', 10, 23, 420 - MARGINS.right, 23]);
    });
  });

  describe('header', () => {
    it('lays out text, multi-line text and images per row and alignment zone', async () => {
      const fields = [
        makeField({ dataBinding: 'h.right', sortOrder: 3, style: style({ alignment: TextAlignment.Right }) }),
        makeField({ dataBinding: 'h.left', sortOrder: 0, style: style({ fontSize: 12, bold: true, underline: true, textColor: '#336699' }) }),
        makeField({ type: ReportFieldType.Image, imageUrl: 'logo.png', sortOrder: 0, width: 40, height: 0, style: style({ alignment: TextAlignment.Right }) }),
        makeField({ dataBinding: 'h.center', sortOrder: 0, style: style({ alignment: TextAlignment.Center, underline: true }) }),
        makeField({ type: ReportFieldType.Image, dataBinding: 'client.photo', sortOrder: 1, width: 0, height: 0 }),
        makeField({ dataBinding: 'h.empty', sortOrder: 1 }),
        makeField({ sortOrder: 2 }),
        makeField({ type: ReportFieldType.Image, dataBinding: 'client.nophoto', sortOrder: 2 }),
      ];
      const template = makeTemplate([makeSection(ReportSectionType.Header, fields)]);
      const provider = makeProvider({
        'h.left': 'Left',
        'h.center': 'Line1\nLonger line 2',
        'h.right': 'R',
        'client.photo': 'data:image/png;base64,BBB',
        'client.nophoto': 'not-an-image',
      });
      const imageCache = new Map([['logo.png', 'data:image/jpeg;base64,AAA']]);

      await service.generatePdf(context(template, { rows: [] }, { provider, imageCache }));

      const leftWidth = textWidth('Left', 12, 'bold');
      const centerWidth = Math.max(textWidth('Line1'), textWidth('Longer line 2'));
      const centerX = MARGINS.left + (CONTENT_WIDTH - (centerWidth + 2)) / 2;
      const rightX = MARGINS.left + CONTENT_WIDTH - (textWidth('R') + 2);
      expect(log).toEqual([
        ['setFontSize', 12], ['setFont', 'helvetica', 'bold'], ['setTextColor', 51, 102, 153],
        ['text', 'Left', 10, 24.2],
        ['setDrawColor', 51, 102, 153], ['setLineWidth', 0.2], ['line', 10, 24.7, round(10 + leftWidth), 24.7],
        ['setFontSize', 10], ['setFont', 'helvetica', 'normal'],
        ['setFontSize', 10], ['setFont', 'helvetica', 'normal'], ['setTextColor', 0, 0, 0],
        ['text', 'Line1', round(centerX), 23.5],
        ['text', 'Longer line 2', round(centerX), 28],
        ['setDrawColor', 0, 0, 0], ['setLineWidth', 0.2],
        ['line', round(centerX), 28.5, round(centerX + textWidth('Longer line 2')), 28.5],
        ['addImage', 'data:image/jpeg;base64,AAA', 'JPEG', round(MARGINS.left + CONTENT_WIDTH - 42), 20, 40, 20],
        ['addImage', 'data:image/png;base64,BBB', 'PNG', 10, 40, 30, 15],
        ['setFontSize', 10], ['setFont', 'helvetica', 'normal'],
        ['setFontSize', 10], ['setFont', 'helvetica', 'normal'], ['setTextColor', 0, 0, 0],
        ['text', 'R', round(rightX), 63.5],
      ]);
    });

    it('loads template images over HTTP and skips plain-text answers', async () => {
      const fields = [
        makeField({ type: ReportFieldType.Image, imageUrl: 'logo', sortOrder: 0, width: 20, height: 8 }),
        makeField({ type: ReportFieldType.Image, imageUrl: 'missing', sortOrder: 1 }),
      ];
      const template = makeTemplate([makeSection(ReportSectionType.Header, fields)]);
      const http = TestBed.inject(HttpTestingController);

      const pending = service.generatePdf(context(template, { rows: [] }));
      http.expectOne(`${environment.baseUrl}LoadFile/DownLoad?type=logo`).flush(new Blob(['x'], { type: 'image/png' }));
      http.expectOne(`${environment.baseUrl}LoadFile/DownLoad?type=missing`).flush(new Blob(['no'], { type: 'text/plain' }));
      await pending;

      expect(log).toEqual([['addImage', 'data:image/png;base64,eA==', 'PNG', 10, 20, 20, 8]]);
      http.verify();
    });
  });

  describe('tables', () => {
    const borderedStyle = style({
      cellBorder: {
        top: { lineStyle: BorderLineStyle.Thin, color: '#ff0000' },
        right: { lineStyle: BorderLineStyle.Dashed, color: '#00ff00' },
        bottom: { lineStyle: BorderLineStyle.Double, color: '#0000ff' },
        left: { lineStyle: BorderLineStyle.None, color: '#000000' },
      },
    });

    function listTemplate(): ReportTemplate {
      const fields = [
        makeField({ name: 'N', dataBinding: 'n', type: ReportFieldType.Number, width: 20, sortOrder: 2, style: style({ alignment: TextAlignment.Right }) }),
        makeField({
          name: 'D', dataBinding: 'd', type: ReportFieldType.Date, width: 30, sortOrder: 0, sortDirection: 'desc',
          styleConditions: [
            { expression: 'cond-hit', textColor: '#00ff00', backgroundColor: '#0000ff', bold: true },
            { expression: '  ', textColor: '#123456' },
            { expression: 'cond-miss', backgroundColor: '#ffffff' },
            { expression: 'boom', backgroundColor: '#ffffff' },
          ],
        }),
        makeField({ name: 'T', dataBinding: 't', width: 50, sortOrder: 1, additionalBindings: ['t2', 't3'], bindingSeparator: ' / ', style: style({ bold: true, italic: true }) }),
        makeField({ name: 'Fx', dataBinding: 'f', type: ReportFieldType.Formula, formula: 'calc', width: 20, sortOrder: 3 }),
        makeField({ name: 'Gx', dataBinding: 'g', type: ReportFieldType.Formula, formula: 'boom', width: 20, sortOrder: 4 }),
      ];
      const list = makeSection(ReportSectionType.WorkTable, fields, {
        sortOrder: 2,
        title: '  Liste  ',
        widthPercent: 150,
        freeTextRows: [
          { text: 'Vorher', position: 'before', style: style({ fontSize: 8, bold: true, textColor: '#ff0000', alignment: TextAlignment.Center }) },
          { text: 'Nachher', position: 'after', style: style({ italic: true, alignment: TextAlignment.Right }) },
        ],
        tableFooterFields: [
          makeField({ name: 'Total', dataBinding: 'x.total', sortOrder: 2, style: style({ alignment: TextAlignment.Right }) }),
          makeField({ name: 'Summe', dataBinding: 'f.sum', type: ReportFieldType.Formula, formula: 'sumf', sortOrder: 0, hideLabel: true }),
          makeField({ name: 'Kaputt', dataBinding: 'f.boom', type: ReportFieldType.Formula, formula: 'boom', sortOrder: 1, style: style({ alignment: TextAlignment.Center }) }),
          makeField({ name: 'Weg', dataBinding: 'x.out', sortOrder: 9 }),
          makeField({ name: 'Std', dataBinding: 'sum.hours', sortOrder: 0 }),
        ],
      });
      const narrow = makeSection(ReportSectionType.ExpensesTable, [makeField({ name: 'N', dataBinding: 'n', width: 10, style: borderedStyle })], {
        sortOrder: 1,
        widthPercent: 5,
      });
      const hidden = makeSection(ReportSectionType.WorkTable, [makeField({ dataBinding: 'n' })], { sortOrder: 3, visible: false });
      const empty = makeSection(ReportSectionType.WorkTable, [], { sortOrder: 4 });
      const filtered = makeSection(ReportSectionType.WorkTable, [makeField({ dataBinding: 'n' })], { sortOrder: 5, rowFilter: 'none' });
      const footer = makeSection(ReportSectionType.Footer, [makeField({ name: 'Summe', dataBinding: 'sum.x' })]);
      return makeTemplate([footer, list, filtered, hidden, narrow, empty], {
        parameters: [{ key: 'p', label: 'P', type: ReportParameterType.Text, defaultValue: 'P1' }],
      });
    }

    const listRows = [
      { d: '01.02.2026', t: 'x', t2: 'y', t3: 'x', n: '5' },
      { d: '03.02.2026', t: 'a', t2: '', n: '7' },
      { d: '02.02.2026', t: 'b', n: '1' },
    ];

    it('renders the body sections in sort order, stacked below each other', async () => {
      const template = listTemplate();

      await service.generatePdf(context(template, { rows: listRows }));

      expect(tables).toHaveLength(2);
      expect(tables[0].settings.startY).toBe(20);
      expect(round(tables[0].settings.tableWidth)).toBe(round(CONTENT_WIDTH * 0.1));
      expect(tables[1].settings.margin.left).toBe(10);
      expect(round(tables[1].settings.tableWidth)).toBe(round(CONTENT_WIDTH));
      expect(round(tables[1].settings.startY)).toBe(round(tables[0].finalY + 5 + 7.5));
      expect(indexOfRun(log, [
        ['setFont', 'helvetica', 'bold'], ['setFontSize', 11], ['setTextColor', 0, 0, 0],
        ['text', 'Liste', 10, tables[0].finalY + 5 + 3.85],
      ])).toBeGreaterThanOrEqual(0);
      expect(rowFilter.filterRows).toHaveBeenCalledTimes(3);
      expect(rowFilter.filterRows.mock.calls[0][1]).toEqual(listRows);
      expect(rowFilter.filterRows.mock.calls[0][3]).toEqual({ parameters: template.parameters, values: undefined });
      expect(log).toContainEqual(['line', 10, round(tables[1].finalY + 5 + 3), round(PAGE_RIGHT), round(tables[1].finalY + 5 + 3)]);
      expect(log).toContainEqual(['text', 'Summe: F:sum.x:0', 10, round(tables[1].finalY + 5 + 8)]);
    });

    it('resolves, sorts and decorates the rows of a table section', async () => {
      const template = listTemplate();

      await service.generatePdf(context(template, { rows: listRows }));

      const table = tables[1];
      expect(template.sections[1].fields.map(f => f.dataBinding)).toEqual(['d', 't', 'n', 'f', 'g']);
      expect(table.columns.map(c => c.raw)).toEqual([
        { header: 'D', dataKey: 'd' },
        { header: 'T', dataKey: 't' },
        { header: 'N', dataKey: 'n' },
        { header: 'Fx', dataKey: 'f' },
        { header: 'Gx', dataKey: 'g' },
      ]);
      const unit = CONTENT_WIDTH / 140;
      expect(round(table.styles['columnStyles'])).toEqual(round({
        d: { cellWidth: 30 * unit, halign: 'left', fontSize: 10, fontStyle: 'normal' },
        t: { cellWidth: 50 * unit, halign: 'left', fontSize: 10, fontStyle: 'bolditalic' },
        n: { cellWidth: 20 * unit, halign: 'right', fontSize: 10, fontStyle: 'normal' },
        f: { cellWidth: 20 * unit, halign: 'left', fontSize: 10, fontStyle: 'normal' },
        g: { cellWidth: 20 * unit, halign: 'left', fontSize: 10, fontStyle: 'normal' },
      }));
      expect(table.styles['headStyles']).toEqual({ fillColor: [66, 66, 66], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' });
      expect(table.styles['bodyStyles']).toEqual({ fontSize: 9 });
      expect(table.styles['footStyles']).toEqual({ fillColor: [230, 230, 230], textColor: [0, 0, 0], fontSize: 9, fontStyle: 'bold' });
      expect(table.styles['alternateRowStyles']).toEqual({ fillColor: [245, 245, 245] });
      expect(table.settings.theme).toBe('grid');
      expect(table.settings.showFoot).toBe('lastPage');
      expect(table.hooks.didDrawCell).toHaveLength(0);
      expect(table.body.map(row => row.raw)).toEqual([
        [{ content: 'Vorher', colSpan: 5, styles: { fontStyle: 'bold', fontSize: 8, textColor: [255, 0, 0], halign: 'center' } }],
        { d: '03.02.2026', t: 'a', n: '7', f: 'calc:7:P1', g: '#ERR' },
        { d: '02.02.2026', t: 'b', n: '1', f: 'calc:1:P1', g: '#ERR' },
        { d: '01.02.2026', t: 'x / y', n: '5', f: 'calc:5:P1', g: '#ERR' },
        [{ content: 'Nachher', colSpan: 5, styles: { fontStyle: 'italic', fontSize: 10, textColor: [0, 0, 0], halign: 'right' } }],
      ]);
      expect(table.foot.map(row => row.raw)).toEqual([[
        { content: 'ev:sumf:3:P1', styles: { halign: 'left' } },
        { content: 'Kaputt: #ERR', styles: { halign: 'center' } },
        { content: 'Total: F:x.total:3', styles: { halign: 'right' } },
        '',
        '',
      ]]);
      const hit = table.body[1].cells[0].styles;
      expect(hit['textColor']).toEqual([0, 255, 0]);
      expect(hit['fillColor']).toEqual([0, 0, 255]);
      expect(hit['fontStyle']).toBe('bold');
      expect(table.body[2].cells[0].styles['fillColor']).not.toEqual([0, 0, 255]);
      expect(table.body[2].cells[0].styles['textColor']).not.toEqual([18, 52, 86]);
    });

    it('draws the configured cell borders side by side', async () => {
      const template = listTemplate();

      await service.generatePdf(context(template, { rows: listRows }));

      const table = tables[0];
      expect(table.hooks.didDrawCell).toHaveLength(1);
      for (const row of table.body) {
        const { x, y, width: w, height: h } = row.cells[0];
        expect(indexOfRun(log, [
          ['setDrawColor', 255, 0, 0], ['setLineWidth', 0.1], ['line', x, y, x + w, y],
          ['setDrawColor', 0, 255, 0], ['setLineWidth', 0.2], ['setLineDashPattern', [1, 1], 0],
          ['line', x + w, y, x + w, y + h], ['setLineDashPattern', [], 0],
          ['setDrawColor', 0, 0, 255], ['setLineWidth', 0.1],
          ['line', x, y + h - 0.4, x + w, y + h - 0.4], ['line', x, y + h + 0.4, x + w, y + h + 0.4],
        ])).toBeGreaterThanOrEqual(0);
      }
    });

    it('groups rows with captions and subtotals', async () => {
      const fields = [
        makeField({ name: 'Gruppe', dataBinding: 'g', width: 10, sortOrder: 0 }),
        makeField({ name: 'V', dataBinding: 'v', type: ReportFieldType.Number, width: 10, sortOrder: 1 }),
        makeField({ name: 'W', dataBinding: 'w', type: ReportFieldType.Currency, width: 10, sortOrder: 2, style: style({ alignment: TextAlignment.Right }) }),
      ];
      const template = makeTemplate([makeSection(ReportSectionType.WorkTable, fields, { groupBy: 'g', groupSubtotals: true })]);
      const rows = [{ g: 'A', v: '1.5', w: '2' }, { g: '', v: '2' }, { g: 'A', v: 'x' }];

      await service.generatePdf(context(template, { rows }));

      const subtotalStyle = { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'left' };
      const subtotal = (v: string, w: string) => [
        { content: 'setting.report.designer.groupSubtotal', styles: subtotalStyle },
        { content: v, styles: subtotalStyle },
        { content: w, styles: { ...subtotalStyle, halign: 'right' } },
      ];
      const caption = (content: string) => [
        { content, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [222, 230, 238], halign: 'left' } },
      ];
      expect(tables[0].body.map(row => row.raw)).toEqual([
        caption('Gruppe: A  (2)'),
        { g: 'A', v: '1.5', w: '2' },
        { g: 'A', v: 'x', w: '' },
        subtotal('1.50', '2.00'),
        caption('Gruppe: setting.report.designer.groupEmpty  (1)'),
        { g: '', v: '2', w: '' },
        subtotal('2.00', '0.00'),
      ]);
      expect(tables[0].foot).toEqual([]);
    });

    it('merges schedule rows of the same day and keeps expenses out of a work table', async () => {
      const fields = [
        makeField({ dataBinding: 'entry.startTime', sortOrder: 1 }),
        makeField({ dataBinding: 'entry.date', type: ReportFieldType.Date, sortOrder: 0 }),
      ];
      const template = makeTemplate([makeSection(ReportSectionType.WorkTable, fields)], {
        sourceId: 'schedule',
        dataSetIds: ['work'],
        mergeRows: true,
      });
      const rows = [
        { entryType: 0, entryDate: '2026-01-05', 'entry.date': '05.01.2026', 'entry.startTime': '08:00' },
        { entryType: 0, entryDate: '2026-01-06', 'entry.date': '06.01.2026', 'entry.startTime': '09:00' },
        { entryType: 0, entryDate: '2026-01-05', 'entry.date': '05.01.2026', 'entry.startTime': '13:00' },
        { entryType: 2, entryDate: '2026-01-05', 'entry.date': '05.01.2026', 'entry.startTime': 'EXP' },
      ];

      await service.generatePdf(context(template, { rows }));

      expect(tables[0].columns.map(c => c.raw)).toEqual([
        { header: 'setting.report.field.entryDate', dataKey: 'entry.date' },
        { header: 'setting.report.field.entryStartTime', dataKey: 'entry.startTime' },
      ]);
      expect(tables[0].body.map(row => row.raw)).toEqual([
        { 'entry.date': '05.01.2026', 'entry.startTime': '08:00\n13:00' },
        { 'entry.date': '06.01.2026', 'entry.startTime': '09:00' },
      ]);
    });

    describe('full period across browser time zones', () => {
      for (const zone of CALENDAR_TEST_ZONES) {
        describe(zone, () => {
          useTimeZone(zone);

          it('fills the missing days of the period with empty rows', async () => {
            const fields = [
              makeField({ dataBinding: 'entry.date', type: ReportFieldType.Date, sortOrder: 0 }),
              makeField({ dataBinding: 'entry.startTime', sortOrder: 1 }),
            ];
            const template = makeTemplate([makeSection(ReportSectionType.WorkTable, fields)], {
              sourceId: 'schedule',
              dataSetIds: ['work'],
              showFullPeriod: true,
            });
            const rows = [
              { entryType: 0, entryDate: '2026-01-05T00:00:00Z', 'entry.date': '05.01.2026', 'entry.startTime': '08:00' },
              { entryType: 0, entryDate: '2026-01-05', 'entry.date': '05.01.2026', 'entry.startTime': '13:00' },
              { entryType: 0, entryDate: '2026-01-06', 'entry.date': '06.01.2026', 'entry.startTime': '09:00' },
            ];

            await service.generatePdf(context(template, { rows }, { startDate: '2026-01-04', endDate: '2026-01-07' }));

            expect(tables[0].body.map(row => row.raw)).toEqual([
              { 'entry.date': '', 'entry.startTime': '' },
              { 'entry.date': '05.01.2026', 'entry.startTime': '08:00\n13:00' },
              { 'entry.date': '06.01.2026', 'entry.startTime': '09:00' },
              { 'entry.date': '', 'entry.startTime': '' },
            ]);
          });
        });
      }
    });
  });

  describe('footer', () => {
    it('writes footer lines, the signature and the page numbers on every client page', async () => {
      const fields = [
        makeField({ type: ReportFieldType.PageNumber, format: '{{page}} / {{pages}}', sortOrder: 0, style: style({ fontSize: 8, alignment: TextAlignment.Center }) }),
        makeField({ type: ReportFieldType.Signature, width: 0, sortOrder: 2, style: style({ fontSize: 9 }) }),
        makeField({ name: 'Summe', dataBinding: 'sum.x', sortOrder: 1, style: style({ underline: true, textColor: '#112233' }) }),
        makeField({ name: 'Formel', dataBinding: 'f.x', type: ReportFieldType.Formula, formula: 'fx', sortOrder: 3 }),
        makeField({ name: 'Kaputt', dataBinding: 'f.boom', type: ReportFieldType.Formula, formula: 'boom', sortOrder: 4 }),
      ];
      const template = makeTemplate([makeSection(ReportSectionType.Footer, fields)], {
        parameters: [{ key: 'p', label: 'P', type: ReportParameterType.Text, defaultValue: 'P1' }],
      });
      const data: ReportData = {
        rows: [{ clientId: 'c1' }, { clientId: 'c2' }, { clientId: 'c2' }, { other: 1 }],
        clients: [{ id: 'c1' }, { id: 'c2' }],
      };

      await service.generatePdf(context(template, data));

      const page = (count: number): LogEntry[] => {
        const sum = `Summe: F:sum.x:${count}`;
        return [
          ['setDrawColor', 100], ['line', 10, 23, round(PAGE_RIGHT), 23],
          ['setFontSize', 10], ['setFont', 'helvetica', 'normal'], ['setTextColor', 17, 34, 51],
          ['text', sum, 10, 28],
          ['setDrawColor', 17, 34, 51], ['setLineWidth', 0.2], ['line', 10, 28.5, round(10 + textWidth(sum)), 28.5],
          ['setDrawColor', 0], ['setLineWidth', 0.2], ['line', 10, 39, 70, 39],
          ['setFontSize', 9], ['setFont', 'helvetica', 'normal'], ['setTextColor', 0, 0, 0],
          ['text', 'setting.report.field.signature', 10, 43.05],
          ['setFontSize', 10], ['setFont', 'helvetica', 'normal'], ['setTextColor', 0, 0, 0],
          ['text', `Formel: ev:fx:${count}:P1`, 10, 47.05],
          ['setFontSize', 10], ['setFont', 'helvetica', 'normal'], ['setTextColor', 0, 0, 0],
          ['text', 'Kaputt: #ERR', 10, 54.05],
        ];
      };
      const pageNumber = (index: number): LogEntry[] => {
        const text = `${index} / 2`;
        return [
          ['setPage', index], ['setFontSize', 8], ['setFont', 'helvetica', 'normal'], ['setTextColor', 0, 0, 0],
          ['text', text, round(10 + (PAGE_RIGHT - 10 - textWidth(text, 8)) / 2), round(A4_HEIGHT - MARGINS.bottom + 6)],
        ];
      };
      expect(log).toEqual([...page(1), ['addPage'], ...page(2), ...pageNumber(1), ...pageNumber(2)]);
      expect(template.sections[0].fields.map(f => f.sortOrder)).toEqual([0, 1, 2, 3, 4]);
    });

    it('skips the page numbers when the footer is hidden', async () => {
      const fields = [makeField({ type: ReportFieldType.PageNumber, format: '{{page}}' })];
      const template = makeTemplate([makeSection(ReportSectionType.Footer, fields, { visible: false })]);

      await service.generatePdf(context(template, { rows: [] }));

      expect(log).toEqual([]);
    });
  });

  describe('right-to-left documents', () => {
    beforeEach(() => {
      document.documentElement.dir = 'rtl';
    });

    it('mirrors header zones, table columns, alignments, borders, footer and page numbers', async () => {
      const header = makeSection(ReportSectionType.Header, [makeField({ dataBinding: 'h' })]);
      const tableFields = [
        makeField({ name: 'A', dataBinding: 'a', width: 10, sortOrder: 0, style: style({
          cellBorder: {
            top: { lineStyle: BorderLineStyle.None, color: '#000000' },
            right: { lineStyle: BorderLineStyle.None, color: '#000000' },
            bottom: { lineStyle: BorderLineStyle.None, color: '#000000' },
            left: { lineStyle: BorderLineStyle.Thick, color: '#ff0000' },
          },
        }) }),
        makeField({ name: 'B', dataBinding: 'b', width: 30, sortOrder: 1, style: style({ alignment: TextAlignment.Right }) }),
      ];
      const table = makeSection(ReportSectionType.WorkTable, tableFields, { sortOrder: 1, title: 'Titel' });
      const footer = makeSection(ReportSectionType.Footer, [
        makeField({ type: ReportFieldType.PageNumber, sortOrder: 0 }),
        makeField({ name: 'Summe', dataBinding: 'sum.x', sortOrder: 1 }),
        makeField({ type: ReportFieldType.Signature, name: ' Unterschrift ', width: 0, sortOrder: 2 }),
      ]);
      const template = makeTemplate([header, table, footer]);
      const provider = makeProvider({ h: 'Kopf' });

      await service.generatePdf(context(template, { rows: [{ a: '1', b: '2' }] }, { provider }));

      const headerX = MARGINS.left + CONTENT_WIDTH - (textWidth('Kopf') + 2);
      expect(log.slice(0, 6)).toEqual([
        ['setFontSize', 10], ['setFont', 'helvetica', 'normal'],
        ['setFontSize', 10], ['setFont', 'helvetica', 'normal'], ['setTextColor', 0, 0, 0],
        ['text', 'Kopf', round(headerX), 23.5],
      ]);
      expect(log).toContainEqual(['text', 'Titel', round(MARGINS.left + CONTENT_WIDTH - textWidth('Titel', 11, 'bold')), 35.85]);
      expect(tables[0].settings.startY).toBe(39.5);
      expect(tables[0].columns.map(c => c.raw)).toEqual([{ header: 'B', dataKey: 'b' }, { header: 'A', dataKey: 'a' }]);
      expect(round(tables[0].styles['columnStyles'])).toEqual(round({
        a: { cellWidth: CONTENT_WIDTH / 4, halign: 'right', fontSize: 10, fontStyle: 'normal' },
        b: { cellWidth: (CONTENT_WIDTH * 3) / 4, halign: 'left', fontSize: 10, fontStyle: 'normal' },
      }));
      const cell = tables[0].body[0].cells[0];
      expect(indexOfRun(log, [
        ['setDrawColor', 255, 0, 0], ['setLineWidth', 0.7],
        ['line', cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height],
      ])).toBeGreaterThanOrEqual(0);
      const footerY = tables[0].finalY + 5 + 8;
      const sum = 'Summe: F:sum.x:1';
      expect(log).toContainEqual(['text', sum, round(PAGE_RIGHT - textWidth(sum)), round(footerY)]);
      expect(log).toContainEqual(['line', round(PAGE_RIGHT - 60), round(footerY + 7 + 4), round(PAGE_RIGHT), round(footerY + 7 + 4)]);
      expect(log).toContainEqual(['text', 'Unterschrift', round(PAGE_RIGHT - 60), round(footerY + 7 + 4 + 4.5)]);
      const pageText = 'setting.report.field.pageNumberFormat';
      expect(log.slice(-1)).toEqual([['text', pageText, round(PAGE_RIGHT - textWidth(pageText)), round(A4_HEIGHT - MARGINS.bottom + 6)]]);
    });
  });
});
