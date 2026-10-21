// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APP_PORT_BINDINGS } from 'src/app/app.port-bindings';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { ReportTemplate, DEFAULT_PAGE_SETUP } from 'src/app/domain/models/report/report-template.model';
import { ReportType } from 'src/app/domain/models/report/report-type.enum';
import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { ReportField, DEFAULT_FIELD_STYLE } from 'src/app/domain/models/report/report-field.model';
import { ReportFieldType } from 'src/app/domain/models/report/report-field-type.enum';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';
import { DataBindingDefinition } from 'src/app/domain/models/report/data-binding-definition.interface';
import { FieldCategory } from 'src/app/domain/models/report/field-category.enum';
import { FormulaEvaluationService } from 'src/app/domain/services/report/formula-evaluation.service';
import { ReportDesignerComponent } from './report-designer.component';
import { ReportDesignerFormulaService } from './services/report-designer-formula.service';
import { ReportDesignerStateService } from './services/report-designer-state.service';
import { ReportDesignerPaletteService } from './services/report-designer-palette.service';
import { ReportDesignerDropZoneService } from './services/report-designer-drop-zone.service';
import { ReportDesignerHeaderService } from './services/report-designer-header.service';
import { ReportDesignerBodyTableService } from './services/report-designer-body-table.service';
import { ReportDesignerSectionFieldsService } from './services/report-designer-section-fields.service';
import { ReportDesignerTableRulesService } from './services/report-designer-table-rules.service';
import { ReportDesignerTableFooterService } from './services/report-designer-table-footer.service';
import { ReportDesignerMergeService } from './services/report-designer-merge.service';

const FORMULA = 'output 1, 1 + 2';

const ENTRY_DATE: DataBindingDefinition = {
  key: 'entry.date', label: 'Datum', i18nKey: 'setting.report.field.entryDate',
  type: ReportFieldType.Date, category: FieldCategory.WorkTable, defaultWidth: 15,
};
const CLIENT_NAME: DataBindingDefinition = {
  key: 'client.name', label: 'Name', i18nKey: 'setting.report.field.clientName',
  type: ReportFieldType.Text, category: FieldCategory.Header, defaultWidth: 30,
};
const SUM_HOURS: DataBindingDefinition = {
  key: 'sum.hours', label: 'Summe Stunden', i18nKey: 'setting.report.field.sumHours',
  type: ReportFieldType.Number, category: FieldCategory.Footer, defaultWidth: 25,
};
const PAGE_NUMBER: DataBindingDefinition = {
  key: 'report.pageNumber', label: 'Seitenzahl', i18nKey: 'setting.report.field.pageNumber',
  type: ReportFieldType.PageNumber, category: FieldCategory.Footer, defaultWidth: 25,
};

const createField = (dataBinding: string, overrides: Partial<ReportField> = {}): ReportField => ({
  name: dataBinding,
  dataBinding,
  type: ReportFieldType.Text,
  width: 20,
  height: 20,
  style: { ...DEFAULT_FIELD_STYLE },
  sortOrder: 0,
  ...overrides,
});

const createSections = (): ReportSection[] => [
  {
    type: ReportSectionType.Header,
    fields: [createField('client.name', { name: 'Client name' })],
    visible: true,
    sortOrder: 0,
  },
  {
    type: ReportSectionType.WorkTable,
    fields: [
      createField('entry.date', { name: 'Date', type: ReportFieldType.Date, width: 30, sortOrder: 0 }),
      createField('entry.hours', { name: 'Hours', type: ReportFieldType.Number, width: 40, sortOrder: 1 }),
    ],
    visible: true,
    sortOrder: 1,
  },
  {
    type: ReportSectionType.Footer,
    fields: [createField('report.pageNumber', { name: 'Page', type: ReportFieldType.PageNumber })],
    visible: true,
    sortOrder: 2,
  },
];

const createTemplate = (overrides: Partial<ReportTemplate> = {}): ReportTemplate => ({
  id: 'template-1',
  name: 'Weekly plan',
  description: 'Plan of the week',
  type: ReportType.Schedule,
  sourceId: 'schedule',
  dataSetIds: ['work'],
  pageSetup: { ...DEFAULT_PAGE_SETUP, margins: { ...DEFAULT_PAGE_SETUP.margins } },
  sections: createSections(),
  ...overrides,
});

const dropFromPalette = (data: DataBindingDefinition): CdkDragDrop<ReportField[]> =>
  ({
    previousContainer: { id: 'palette' },
    container: { id: 'target' },
    item: { data },
    previousIndex: 0,
    currentIndex: 0,
  }) as unknown as CdkDragDrop<ReportField[]>;

const reorderWithin = (previousIndex: number, currentIndex: number): CdkDragDrop<ReportField[]> => {
  const container = { id: 'same' };
  return {
    previousContainer: container,
    container,
    item: { data: undefined },
    previousIndex,
    currentIndex,
  } as unknown as CdkDragDrop<ReportField[]>;
};

describe('ReportDesignerComponent (characterization)', () => {
  let fixture: ComponentFixture<ReportDesignerComponent>;
  let component: ReportDesignerComponent;
  let http: HttpTestingController;
  let template: ReportTemplate;
  let emitted: ReportTemplate[];
  let manualLoader: { loadManual: ReturnType<typeof vi.fn> };

  const designer = () => component;
  const service = <T>(token: new (...args: never[]) => T): T => fixture.debugElement.injector.get(token);
  const state = () => service(ReportDesignerStateService);
  const palette = () => service(ReportDesignerPaletteService);
  const dropZones = () => service(ReportDesignerDropZoneService);
  const header = () => service(ReportDesignerHeaderService);
  const tables = () => service(ReportDesignerBodyTableService);
  const sectionFields = () => service(ReportDesignerSectionFieldsService);
  const rules = () => service(ReportDesignerTableRulesService);
  const tableFooter = () => service(ReportDesignerTableFooterService);
  const merge = () => service(ReportDesignerMergeService);
  const formula = () => service(ReportDesignerFormulaService);
  const activeField = () => state().activeField();
  const showStyleConditions = () => state().showStyleConditions();

  const current = () => component.template();
  const headerOf = () => current().sections.find(s => s.type === ReportSectionType.Header)!;
  const bodyOf = (index = 0) =>
    current().sections.filter(s => s.type === ReportSectionType.WorkTable).sort((a, b) => a.sortOrder - b.sortOrder)[index];
  const footerOf = () => current().sections.find(s => s.type === ReportSectionType.Footer)!;

  const query = <T extends Element = HTMLElement>(selector: string): T | null =>
    fixture.nativeElement.querySelector(selector) as T | null;
  const queryAll = <T extends Element = HTMLElement>(selector: string): T[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector)) as T[];
  const text = (selector: string) => query(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const click = (element: Element | null) => {
    (element as HTMLElement).click();
    fixture.detectChanges();
  };
  const typeInto = (element: Element | null, value: string, eventName = 'input') => {
    const input = element as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event(eventName));
    fixture.detectChanges();
  };

  const refresh = () => render({ ...current() });

  const render = (value: ReportTemplate, inputs: Record<string, unknown> = {}) => {
    fixture.componentRef.setInput('template', value);
    for (const [name, inputValue] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, inputValue);
    }
    fixture.detectChanges();
  };

  const dropListSnapshot = () =>
    fixture.debugElement
      .queryAll(By.directive(CdkDropList))
      .map(debugElement => {
        const list = debugElement.injector.get(CdkDropList);
        const connectedTo = Array.isArray(list.connectedTo) ? [...(list.connectedTo as string[])] : list.connectedTo;
        return { id: list.id, connectedTo };
      });

  beforeEach(async () => {
    manualLoader = { loadManual: vi.fn().mockReturnValue(of('<p>manual</p>')) };

    await TestBed.configureTestingModule({
      imports: [ReportDesignerComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...APP_PORT_BINDINGS,
        { provide: ManualLoaderService, useValue: manualLoader },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportDesignerComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.template.subscribe(value => emitted.push(value));
    template = createTemplate();
    render(template);
  });

  afterEach(() => {
    http.verify();
  });

  describe('layout and geometry', () => {
    it('shows the page geometry of the page setup', () => {
      // Arrange
      // Act
      const geometry = text('.page-geometry');

      // Assert
      expect(geometry).toContain('A4');
      expect(geometry).toContain('297 × 210 mm');
      expect(geometry).toContain('257 mm');
      expect(state().pageGeometry.usableWidthMm).toBe(257);
    });

    it('shows the schedule-only options and section toggle only for the schedule source', () => {
      // Arrange
      expect(query('#designerMergeRows')).not.toBeNull();
      expect(query('.section-show-full-period')).not.toBeNull();

      // Act
      render(createTemplate(), { sourceId: 'all-address', dataSetIds: ['clients'] });

      // Assert
      expect(query('#designerMergeRows')).toBeNull();
      expect(query('.section-show-full-period')).toBeNull();
    });

    it('writes the merge-rows checkbox into the template and emits a new template object', () => {
      // Arrange
      const checkbox = query<HTMLInputElement>('#designerMergeRows')!;
      checkbox.checked = true;

      // Act
      checkbox.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Assert
      expect(current().mergeRows).toBe(true);
      expect(emitted.length).toBe(1);
      expect(emitted[0]).not.toBe(template);
      expect(emitted[0].sections).toBe(template.sections);
    });

    it('re-renders when the template input is replaced from outside without any DOM event', () => {
      // Arrange
      const next = createTemplate();
      next.sections[1].title = 'External title';

      // Act
      render(next);

      // Assert
      expect(query<HTMLInputElement>('.section-title-input')!.value).toBe('External title');
    });

    it('loads the preview of existing static images from the server', () => {
      // Arrange
      const next = createTemplate();
      next.sections[0].fields.push(createField('report.image', {
        type: ReportFieldType.Image, imageUrl: 'logo.png', sortOrder: 0,
      }));

      // Act
      render(next);

      // Assert
      const request = http.expectOne(r => r.url.endsWith('LoadFile/DownLoad?type=logo.png'));
      expect(request.request.method).toBe('GET');
      request.flush(new Blob(['x'], { type: 'text/plain' }));
    });

    it('shows a stored header logo as soon as its preview is loaded, without further interaction', async () => {
      // Arrange
      const next = createTemplate();
      next.sections[0].fields.push(createField('report.image', {
        type: ReportFieldType.Image, imageUrl: 'logo.png', sortOrder: 1,
      }));
      const cache = new Map<string, string>();
      render(next, { imagePreviewCache: cache });
      expect(query('.header-zone img.header-image-preview')).toBeNull();

      // Act
      http.expectOne(r => r.url.endsWith('LoadFile/DownLoad?type=logo.png'))
        .flush(new Blob(['png'], { type: 'image/png' }));
      await vi.waitFor(() => expect(cache.has('logo.png')).toBe(true));
      fixture.detectChanges();

      // Assert
      const preview = query<HTMLImageElement>('.header-zone img.header-image-preview');
      expect(preview!.getAttribute('src')).toMatch(/^data:image\/png/);
    });
  });

  describe('palette', () => {
    it('builds header, table and footer groups for a single data set', () => {
      // Arrange
      // Act
      const groups = palette().paletteGroups;

      // Assert
      expect(groups.map(g => g.id)).toEqual(['header', 'table', 'footer']);
      expect(groups.map(g => g.sectionType)).toEqual([
        ReportSectionType.Header, ReportSectionType.WorkTable, ReportSectionType.Footer,
      ]);
      expect(queryAll('.palette-group').length).toBe(3);
    });

    it('hides header and footer fields that are already placed, but keeps all table fields', () => {
      // Arrange
      const groups = palette().paletteGroups;

      // Act
      const headerFields = palette().getAvailableFields(groups[0]);
      const tableFields = palette().getAvailableFields(groups[1]);
      const footerFields = palette().getAvailableFields(groups[2]);

      // Assert
      expect(headerFields.some(f => f.key === 'client.name')).toBe(false);
      expect(headerFields.some(f => f.key === 'report.image')).toBe(true);
      expect(tableFields.some(f => f.key === 'entry.date')).toBe(true);
      expect(footerFields.some(f => f.key === 'report.pageNumber')).toBe(false);
      expect(queryAll('.palette-group .badge').map(b => b.textContent?.trim())).toEqual([
        String(headerFields.length), String(tableFields.length), String(footerFields.length),
      ]);
    });

    it('groups data sets with identical table fields and merges their footer fields', () => {
      // Arrange
      render(createTemplate(), { dataSetIds: ['work', 'break', 'expenses'] });

      // Act
      const groups = palette().paletteGroups;

      // Assert
      expect(groups.map(g => g.id)).toEqual(['header', 'table-0', 'table-1', 'footer']);
      expect(groups[1].title).toBe('setting.report.dataset.work / setting.report.dataset.break');
      expect(groups[2].title).toBe('setting.report.dataset.expenses');
      expect(groups[3].fields.map(f => f.key)).toEqual([
        'sum.hours', 'sum.surcharges', 'sum.workDays', 'report.pageNumber', 'report.signature', 'sum.expenses',
      ]);
      expect(dropZones().allTablePaletteIds).toEqual(['palette-table-0', 'palette-table-1']);
    });

    it('returns no groups and clears the prefix map when no data set is active', () => {
      // Arrange
      render(createTemplate(), { dataSetIds: ['unknown'] });

      // Act
      const groups = palette().paletteGroups;

      // Assert
      expect(groups).toEqual([]);
      expect(palette().getFieldDisplayLabel(ENTRY_DATE)).toBe('setting.report.field.entryDate');
    });

    it('prefixes the label of a dropped field with its data set when two data sets share a label', () => {
      // Arrange
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', {
        'setting.report.field.entryDate': 'Date',
        'setting.report.field.expenseDate': 'Date',
        'setting.report.dataset.work': 'Work',
        'setting.report.dataset.expenses': 'Expenses',
      });
      translate.use('en');
      render(createTemplate({ sections: [
        { type: ReportSectionType.WorkTable, fields: [], visible: true, sortOrder: 1 },
      ] }), { dataSetIds: ['work', 'expenses'] });

      // Act
      sectionFields().onBodyTableFieldDrop(dropFromPalette(ENTRY_DATE), bodyOf());

      // Assert
      expect(bodyOf().fields[0].name).toBe('Work.Date');
    });

    it('uses the plain label without prefix for a single data set', () => {
      // Arrange
      const body = bodyOf();
      body.fields = [];

      // Act
      sectionFields().onBodyTableFieldDrop(dropFromPalette(ENTRY_DATE), body);

      // Assert
      expect(body.fields[0].name).toBe('setting.report.field.entryDate');
      expect(body.fields[0].width).toBe(15);
      expect(emitted.length).toBe(1);
    });
  });

  describe('drop lists', () => {
    it('wires every drop list with its id and connections', () => {
      // Arrange
      // Act
      const snapshot = dropListSnapshot();

      // Assert
      expect(snapshot).toEqual([
        { id: 'palette-header', connectedTo: ['zone-0-0', 'zone-0-1', 'zone-0-2'] },
        { id: 'palette-table', connectedTo: ['body-table-0'] },
        { id: 'palette-footer', connectedTo: ['section-footer'] },
        { id: 'zone-0-0', connectedTo: ['palette-header'] },
        { id: 'zone-0-1', connectedTo: ['palette-header'] },
        { id: 'zone-0-2', connectedTo: ['palette-header'] },
        { id: 'body-table-0', connectedTo: ['palette-table'] },
        { id: 'section-footer', connectedTo: ['palette-footer'] },
      ]);
    });

    it('connects additional body tables and header rows', () => {
      // Arrange
      tables().addBodyTable();
      header().onHeaderFieldDrop(dropFromPalette(PAGE_NUMBER), headerOf(), 1, TextAlignment.Right);
      render(current(), { dataSetIds: ['work', 'expenses'] });

      // Act
      const snapshot = dropListSnapshot();

      // Assert
      expect(dropZones().headerZoneIds).toEqual(['zone-0-0', 'zone-0-1', 'zone-0-2', 'zone-1-0', 'zone-1-1', 'zone-1-2']);
      expect(dropZones().allBodyTableDropIds).toEqual(['body-table-0', 'body-table-1']);
      expect(snapshot.map(s => s.id)).toEqual([
        'palette-header', 'palette-table-0', 'palette-table-1', 'palette-footer',
        'zone-0-0', 'zone-0-1', 'zone-0-2', 'zone-1-0', 'zone-1-1', 'zone-1-2',
        'body-table-0', 'body-table-1', 'section-footer',
      ]);
      expect(snapshot.find(s => s.id === 'body-table-1')!.connectedTo).toEqual(['palette-table-0', 'palette-table-1']);
      expect(snapshot.find(s => s.id === 'palette-table-1')!.connectedTo).toEqual(['body-table-0', 'body-table-1']);
    });

    it('maps palette groups to the drop targets of their section type', () => {
      // Arrange
      const groups = palette().paletteGroups;

      // Act
      const targets = groups.map(g => dropZones().getPaletteConnectedTo(g));

      // Assert
      expect(targets).toEqual([['zone-0-0', 'zone-0-1', 'zone-0-2'], ['body-table-0'], ['section-footer']]);
      expect(dropZones().getBodyTableDropId(bodyOf())).toBe('body-table-0');
    });
  });

  describe('active field and toolbar', () => {
    it('shows the toolbar only after a chip was selected and marks the chip active', () => {
      // Arrange
      expect(query('.global-toolbar')).toBeNull();

      // Act
      click(query('.header-zone .zone-chip'));

      // Assert
      expect(activeField()).toBe(headerOf().fields[0]);
      expect(query('.global-toolbar')).not.toBeNull();
      expect(query('.header-zone .zone-chip')!.classList).toContain('chip-active');
      expect(emitted.length).toBe(0);
    });

    it('hides alignment and border tools for header fields and shows them for table columns', () => {
      // Arrange
      click(query('.header-zone .zone-chip'));
      expect(query('.align-left-icon')).toBeNull();
      expect(query('.border-toolbar')).toBeNull();
      expect(state().isHeaderField(headerOf().fields[0])).toBe(true);

      // Act
      click(query('.table-column'));

      // Assert
      expect(query('.align-left-icon')).not.toBeNull();
      expect(query('.border-toolbar')).not.toBeNull();
      expect(query('.table-column')!.classList).toContain('column-active');
    });

    it('toggles bold of the active field and emits a change', () => {
      // Arrange
      click(query('.table-column'));

      // Act
      click(query('.global-toolbar .tb-btn'));

      // Assert
      expect(bodyOf().fields[0].style.bold).toBe(true);
      expect(emitted.length).toBe(1);
      expect(query('.global-toolbar .tb-btn')!.classList).toContain('active');
    });

    it('clamps the font size between 6 and 48', () => {
      // Arrange
      click(query('.table-column'));

      // Act
      typeInto(query('.global-toolbar .tb-size'), '60');
      const upper = bodyOf().fields[0].style.fontSize;
      typeInto(query('.global-toolbar .tb-size'), '2');

      // Assert
      expect(upper).toBe(48);
      expect(bodyOf().fields[0].style.fontSize).toBe(6);
    });

    it('clamps the image width and height between 5 and 200', () => {
      // Arrange
      const image = createField('client.photo', { type: ReportFieldType.Image, width: 30, height: 15 });
      headerOf().fields.push(image);
      state().selectField(image);
      refresh();
      const [width, height] = queryAll('.global-toolbar .tb-size').slice(1);

      // Act
      typeInto(width, '500');
      typeInto(height, '1');

      // Assert
      expect(image.width).toBe(200);
      expect(image.height).toBe(5);
    });

    it('applies the alignment buttons to the active table column', () => {
      // Arrange
      click(query('.table-column'));

      // Act
      click(query('.align-right-icon')!.parentElement);

      // Assert
      expect(bodyOf().fields[0].style.alignment).toBe(TextAlignment.Right);
      expect(emitted.length).toBe(1);
    });

    it('toggles a border side and sets all borders through the border service', () => {
      // Arrange
      click(query('.table-column'));

      // Act
      click(query('.border-top-icon')!.parentElement);
      const topOnly = bodyOf().fields[0].style.cellBorder!;
      const [topAfterToggle, rightAfterToggle] = [topOnly.top.lineStyle, topOnly.right.lineStyle];
      click(query('.fa-border-all')!.parentElement);

      // Assert
      expect(topAfterToggle).not.toBe(rightAfterToggle);
      const border = bodyOf().fields[0].style.cellBorder!;
      expect([border.top, border.right, border.bottom, border.left].every(s => s.lineStyle === border.top.lineStyle)).toBe(true);
      expect(emitted.length).toBe(2);
    });

    it('keeps the style-conditions panel open across field changes and while no field is active', () => {
      // Arrange
      click(query('.table-column'));
      const toggle = queryAll('.global-toolbar .tb-btn').find(b => b.textContent?.includes('conditionToggleShort'))!;
      click(toggle);
      expect(showStyleConditions()).toBe(true);
      expect(query('app-style-conditions')).not.toBeNull();

      // Act
      click(queryAll('.table-column')[1]);
      const afterSwitch = query('app-style-conditions');
      sectionFields().removeFieldFromSection(bodyOf().fields[1], bodyOf());
      fixture.detectChanges();
      const whileInactive = query('.global-toolbar');
      click(query('.table-column'));

      // Assert
      expect(afterSwitch).not.toBeNull();
      expect(whileInactive).toBeNull();
      expect(showStyleConditions()).toBe(true);
      expect(query('app-style-conditions')).not.toBeNull();
    });

    it('hides the style-conditions panel for header fields even when it is switched on', () => {
      // Arrange
      click(query('.table-column'));
      click(queryAll('.global-toolbar .tb-btn').find(b => b.textContent?.includes('conditionToggleShort'))!);

      // Act
      click(query('.header-zone .zone-chip'));

      // Assert
      expect(query('app-style-conditions')).toBeNull();
      expect(showStyleConditions()).toBe(true);
    });

    it('lists merge candidates without used, duplicate and image fields and adds them with a newline separator', () => {
      // Arrange
      render(current(), { dataSetIds: ['work', 'break'] });
      const date = bodyOf().fields[0];

      // Act
      const options = merge().getAvailableMergeFields(date);
      merge().addMergedBinding(date, 'entry.weekday');

      // Assert
      expect(options.some(o => o.key === 'entry.date')).toBe(false);
      expect(new Set(options.map(o => o.key)).size).toBe(options.length);
      expect(options[0].label).toBe('setting.report.dataset.work.setting.report.field.entryWeekday');
      expect(date.additionalBindings).toEqual(['entry.weekday']);
      expect(date.bindingSeparator).toBe('\n');
      expect(merge().getMergedFieldLabel('entry.weekday')).toBe(options[0].label);
      expect(merge().getMergedFieldLabel('unknown.key')).toBe('unknown.key');
      expect(emitted.length).toBe(1);
    });

    it('ignores empty and duplicate merge keys and drops the separator with the last merged binding', () => {
      // Arrange
      const date = bodyOf().fields[0];
      merge().addMergedBinding(date, 'entry.weekday');
      merge().addMergedBinding(date, '');
      merge().addMergedBinding(date, 'entry.weekday');

      // Act
      merge().removeMergedBinding(date, 'entry.weekday');

      // Assert
      expect(date.additionalBindings).toBeUndefined();
      expect(date.bindingSeparator).toBeUndefined();
      expect(emitted.length).toBe(2);
    });

    it('renders merged bindings as removable tags on the column', () => {
      // Arrange
      merge().addMergedBinding(bodyOf().fields[0], 'entry.weekday');
      refresh();

      // Act
      click(query('.merged-remove'));

      // Assert
      expect(bodyOf().fields[0].additionalBindings).toBeUndefined();
      expect(query('.merged-field-tag')).toBeNull();
    });
  });

  describe('header section', () => {
    it('shows the drop placeholder in the left zone when the row only holds the blank row field', () => {
      // Arrange
      headerOf().fields = [];

      // Act
      click(query('.header-section .btn-add-row'));
      const zones = queryAll('.header-zone');

      // Assert
      expect(headerOf().fields.length).toBe(1);
      expect(headerOf().fields[0].dataBinding).toBe('');
      expect(zones.length).toBe(3);
      expect(zones.map(z => z.querySelector('.zone-placeholder') !== null)).toEqual([true, true, true]);
      expect(zones[0].querySelector('.zone-chip')).toBeNull();
      expect(emitted.length).toBe(1);
    });

    it('shows the placeholder in center and right zones only when they are empty', () => {
      // Arrange
      headerOf().fields.push(
        createField('', { style: { ...DEFAULT_FIELD_STYLE, alignment: TextAlignment.Center }, sortOrder: 0 }),
      );

      // Act
      refresh();
      const zones = queryAll('.header-zone');

      // Assert
      expect(zones.map(z => z.querySelector('.zone-placeholder') !== null)).toEqual([false, false, true]);
    });

    it('adds a dropped header field in the zone alignment and makes it active', () => {
      // Arrange
      // Act
      header().onHeaderFieldDrop(dropFromPalette(SUM_HOURS), headerOf(), 0, TextAlignment.Center);
      fixture.detectChanges();

      // Assert
      const added = headerOf().fields[1];
      expect(added.style.alignment).toBe(TextAlignment.Center);
      expect(added.sortOrder).toBe(0);
      expect(activeField()).toBe(added);
      expect(queryAll('.header-zone')[1].querySelector('.chip-label')!.textContent).toBe('setting.report.field.sumHours');
      expect(emitted.length).toBe(1);
    });

    it('ignores re-ordering inside a header zone and duplicate header fields but still emits', () => {
      // Arrange
      // Act
      header().onHeaderFieldDrop(reorderWithin(0, 0), headerOf(), 0, TextAlignment.Left);
      header().onHeaderFieldDrop(dropFromPalette(CLIENT_NAME), headerOf(), 0, TextAlignment.Left);

      // Assert
      expect(headerOf().fields.length).toBe(1);
      expect(activeField()).toBeNull();
      expect(emitted.length).toBe(2);
    });

    it('removes a header field from the chip and clears the active field', () => {
      // Arrange
      click(query('.header-zone .zone-chip'));

      // Act
      click(query('.header-zone .zone-chip .chip-btn.remove'));

      // Assert
      expect(headerOf().fields.length).toBe(0);
      expect(activeField()).toBeNull();
      expect(query('.global-toolbar')).toBeNull();
    });

    it('deletes the uploaded image on the server when a static image chip is removed', () => {
      // Arrange
      const image = createField('report.image', { type: ReportFieldType.Image, imageUrl: 'logo.png' });
      headerOf().fields = [image];
      component.imagePreviewCache().set('logo.png', 'data:image/png;base64,AAA');

      // Act
      header().removeHeaderField(headerOf(), image);

      // Assert
      const request = http.expectOne(r => r.url.endsWith('LoadFile/logo.png'));
      expect(request.request.method).toBe('DELETE');
      request.flush(null);
      expect(component.imagePreviewCache().has('logo.png')).toBe(false);
      expect(headerOf().fields.length).toBe(0);
    });

    it('renders static images as preview, upload chip or plain chip depending on url and binding', () => {
      // Arrange
      const next = createTemplate();
      next.sections[0].fields = [
        createField('report.image', { type: ReportFieldType.Image, imageUrl: 'logo.png', sortOrder: 0 }),
        createField('report.image', { type: ReportFieldType.Image, sortOrder: 1 }),
        createField('client.photo', { type: ReportFieldType.Image, name: 'Photo', sortOrder: 2 }),
        createField('report.customText', { name: 'Hello', sortOrder: 3 }),
      ];
      const cache = new Map<string, string>([['logo.png', 'data:image/png;base64,AAA']]);

      // Act
      render(next, { imagePreviewCache: cache });

      // Assert
      const rows = queryAll('.header-row');
      expect(rows[0].querySelector('img.header-image-preview')!.getAttribute('src')).toBe('data:image/png;base64,AAA');
      expect(rows[1].querySelector('.image-upload-zone input[type="file"]')).not.toBeNull();
      expect(rows[2].querySelector('.chip-label')!.textContent).toBe('Photo');
      expect(rows[3].querySelector<HTMLTextAreaElement>('.custom-text-textarea')!.value).toBe('Hello');
    });

    it('writes typed custom text into the field name and emits', () => {
      // Arrange
      headerOf().fields = [createField('report.customText', { name: '' })];
      refresh();

      // Act
      typeInto(query('.custom-text-textarea'), 'Note');

      // Assert
      expect(headerOf().fields[0].name).toBe('Note');
      expect(emitted.length).toBe(1);
    });

    it('removes a header row, renumbers the remaining rows and clears an active field of the removed row', () => {
      // Arrange
      header().onHeaderFieldDrop(dropFromPalette(SUM_HOURS), headerOf(), 1, TextAlignment.Left);
      header().onHeaderFieldDrop(dropFromPalette(PAGE_NUMBER), headerOf(), 2, TextAlignment.Left);
      state().selectField(headerOf().fields[1]);

      // Act
      header().removeHeaderRow(headerOf(), 1);

      // Assert
      expect(headerOf().fields.map(f => [f.dataBinding, f.sortOrder])).toEqual([
        ['client.name', 0], ['report.pageNumber', 1],
      ]);
      expect(activeField()).toBeNull();
    });

    it('removes a header row through its row button', () => {
      // Arrange
      // Act
      click(query('.row-remove'));

      // Assert
      expect(headerOf().fields.length).toBe(0);
      expect(queryAll('.header-row').length).toBe(0);
      expect(emitted.length).toBe(1);
    });

    it('uploads a header image into the row and selects it', async () => {
      // Arrange
      const file = new File(['png'], 'logo.png', { type: 'image/png' });
      const event = { target: { files: [file], value: 'C:\\logo.png' } } as unknown as Event;

      // Act
      const pending = header().onImageUpload(event, headerOf(), 0, TextAlignment.Left);
      await vi.waitFor(() => http.expectOne(r => r.url.endsWith('LoadFile/Upload/')).flush({}));
      await pending;

      // Assert
      const added = headerOf().fields[1];
      expect(added.type).toBe(ReportFieldType.Image);
      expect(added.dataBinding).toBe('report.image');
      expect(added.imageUrl).toMatch(/^report-img-.+\.png$/);
      expect(activeField()).toBe(added);
      expect(emitted.length).toBe(1);
      fixture.detectChanges();
      const preview = queryAll('.header-row')[0].querySelector<HTMLImageElement>('img.header-image-preview');
      expect(preview!.getAttribute('src')).toMatch(/^data:image\/png/);
    });

    it('turns the upload chip of an already active image field into a preview after the upload', async () => {
      // Arrange
      headerOf().fields = [createField('report.image', { type: ReportFieldType.Image })];
      refresh();
      click(query('.image-upload-zone'));
      const field = headerOf().fields[0];
      expect(activeField()).toBe(field);
      const input = query<HTMLInputElement>('.image-upload-zone input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: [new File(['png'], 'logo.png', { type: 'image/png' })] });

      // Act
      input.dispatchEvent(new Event('change'));
      await vi.waitFor(() => http.expectOne(r => r.url.endsWith('LoadFile/Upload/')).flush({}));
      await vi.waitFor(() => expect(field.imageUrl).toBeDefined());
      await Promise.resolve();
      fixture.detectChanges();

      // Assert
      expect(activeField()).toBe(field);
      expect(emitted.length).toBe(1);
      expect(query('.header-zone .image-upload-zone')).toBeNull();
      expect(query('.header-zone img.header-image-preview')!.getAttribute('src')).toMatch(/^data:image\/png/);
    });
  });

  describe('outside replacement of the template', () => {
    it('re-renders header, body table and page footer for a shallow copy that keeps the section objects', () => {
      // Arrange
      headerOf().fields[0].name = 'Renamed client';
      bodyOf().title = 'Renamed table';
      footerOf().fields[0].name = 'Renamed page';

      // Act
      refresh();

      // Assert
      expect(text('.header-zone .chip-label')).toBe('Renamed client');
      expect(query<HTMLInputElement>('.section-title-input')!.value).toBe('Renamed table');
      expect(text('.field-chips .chip-label')).toBe('Renamed page');
      expect(emitted.length).toBe(0);
    });

    it('re-renders the palette when a header field is removed in a header zone', () => {
      // Arrange
      const badge = () => Number(queryAll('.palette-group .badge')[0].textContent?.trim());
      const before = badge();

      // Act
      click(query('.header-zone .zone-chip .chip-btn.remove'));

      // Assert
      expect(badge()).toBe(before + 1);
    });

    it('re-renders the toolbar formula status when the formula is edited in the formula editor', () => {
      // Arrange
      click(query('.add-formula-column'));
      click(query('.formula-edit-btn'));
      expect(query('.global-toolbar .formula-status')!.classList).toContain('status-empty');

      // Act
      typeInto(query('.formula-textarea'), FORMULA);

      // Assert
      expect(query('.global-toolbar .formula-status')!.classList).toContain('status-valid');
    });

    it('re-renders the body table when a merged field is added in the toolbar', () => {
      // Arrange
      click(query('.table-column'));
      const mergeSelect = queryAll<HTMLSelectElement>('.global-toolbar select.tb-select')
        .find(select => select.querySelector('option[value="entry.weekday"]'))!;

      // Act
      mergeSelect.value = 'entry.weekday';
      mergeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Assert
      expect(bodyOf().fields[0].additionalBindings).toEqual(['entry.weekday']);
      expect(text('.table-column .merged-field-tag')).toContain('setting.report.field.entryWeekday');
      expect(mergeSelect.value).toBe('');
    });
  });

  describe('body tables', () => {
    it('sums column widths in percent and millimetres and flags more than 100 percent', () => {
      // Arrange
      const body = bodyOf();

      // Act
      const below = tables().getColumnWidthSummary(body);
      body.widthPercent = 50;
      body.fields[1].width = 80;
      const above = tables().getColumnWidthSummary(body);

      // Assert
      expect(below).toEqual({ percent: 70, mm: 257, exceeds: false });
      expect(above).toEqual({ percent: 110, mm: 129, exceeds: true });
    });

    it('renders the width summary with the exceed marker', () => {
      // Arrange
      typeInto(queryAll('.width-input')[1], '80', 'input');

      // Act
      typeInto(queryAll('.width-input')[1], '80', 'change');

      // Assert
      expect(text('.width-sum')).toContain('110 %');
      expect(query('.width-sum')!.classList).toContain('width-sum-exceeds');
    });

    it('clamps a column width between 5 and 100 on change', () => {
      // Arrange
      const field = bodyOf().fields[0];

      // Act
      field.width = 150;
      sectionFields().onWidthChange(field);
      const upper = field.width;
      field.width = 1;
      sectionFields().onWidthChange(field);

      // Assert
      expect(upper).toBe(100);
      expect(field.width).toBe(5);
      expect(emitted.length).toBe(2);
    });

    it('distributes the column widths evenly with one decimal', () => {
      // Arrange
      const body = bodyOf();
      body.fields.push(createField('entry.weekday', { sortOrder: 2 }));

      // Act
      click(query('.distribute-widths'));

      // Assert
      expect(body.fields.map(f => f.width)).toEqual([33.3, 33.3, 33.3]);
      expect(emitted.length).toBe(1);
    });

    it('does nothing when distributing an empty table', () => {
      // Arrange
      const body = bodyOf();
      body.fields = [];

      // Act
      tables().distributeColumnWidths(body);

      // Assert
      expect(emitted.length).toBe(0);
    });

    it('parses and clamps the table width percent and resets it on invalid input', () => {
      // Arrange
      const body = bodyOf();

      // Act
      tables().setSectionWidthPercent(body, '5');
      const lower = body.widthPercent;
      tables().setSectionWidthPercent(body, '150');
      const upper = body.widthPercent;
      tables().setSectionWidthPercent(body, '');

      // Assert
      expect(lower).toBe(10);
      expect(upper).toBe(100);
      expect(body.widthPercent).toBeUndefined();
      expect(emitted.length).toBe(3);
    });

    it('writes the table title from the title input', () => {
      // Arrange
      // Act
      typeInto(query('.section-title-input'), 'Shifts');

      // Assert
      expect(bodyOf().title).toBe('Shifts');
      expect(emitted.length).toBe(1);
    });

    it('falls back from section to template show-full-period and stores the section flag', () => {
      // Arrange
      const body = bodyOf();
      const before = state().isSectionShowFullPeriod(body);
      current().showFullPeriod = true;
      const inherited = state().isSectionShowFullPeriod(body);

      // Act
      tables().toggleSectionShowFullPeriod(body, false);

      // Assert
      expect(before).toBe(false);
      expect(inherited).toBe(true);
      expect(state().isSectionShowFullPeriod(body)).toBe(false);
      expect(emitted.length).toBe(1);
    });

    it('adds a body table after the last body table and moves the footer behind it', () => {
      // Arrange
      // Act
      click(query('.btn-add-table'));

      // Assert
      expect(current().sections.map(s => [s.type, s.sortOrder])).toEqual([
        [ReportSectionType.Header, 0],
        [ReportSectionType.WorkTable, 1],
        [ReportSectionType.Footer, 3],
        [ReportSectionType.WorkTable, 2],
      ]);
      expect(queryAll('.body-table-section').length).toBe(2);
      expect(queryAll('.body-table-section')[1].querySelector('.table-type-badge')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('setting.report.designer.sectionTable 2');
      expect(emitted.length).toBe(1);
    });

    it('places the first body table after the header when none exists', () => {
      // Arrange
      render(createTemplate({ sections: [
        { type: ReportSectionType.Header, fields: [], visible: true, sortOrder: 4 },
      ] }));

      // Act
      tables().addBodyTable();

      // Assert
      expect(bodyOf().sortOrder).toBe(5);
    });

    it('keeps the last body table and disables its remove button', () => {
      // Arrange
      const removeButton = query<HTMLButtonElement>('.table-remove')!;

      // Act
      tables().removeBodyTable(bodyOf());

      // Assert
      expect(removeButton.disabled).toBe(true);
      expect(state().bodySections.length).toBe(1);
      expect(emitted.length).toBe(0);
    });

    it('removes a body table, renumbers all sections and clears an active field of the table', () => {
      // Arrange
      tables().addBodyTable();
      fixture.detectChanges();
      state().selectField(bodyOf().fields[0]);

      // Act
      click(query('.table-remove'));

      // Assert
      expect(current().sections.map(s => [s.type, s.sortOrder])).toEqual([
        [ReportSectionType.Header, 0],
        [ReportSectionType.WorkTable, 1],
        [ReportSectionType.Footer, 2],
      ]);
      expect(bodyOf().fields).toEqual([]);
      expect(activeField()).toBeNull();
    });

    it('re-orders columns inside a table and renumbers them', () => {
      // Arrange
      const body = bodyOf();

      // Act
      sectionFields().onBodyTableFieldDrop(reorderWithin(0, 1), body);

      // Assert
      expect(body.fields.map(f => [f.dataBinding, f.sortOrder])).toEqual([['entry.hours', 0], ['entry.date', 1]]);
      expect(emitted.length).toBe(1);
    });

    it('does not add a column twice', () => {
      // Arrange
      const body = bodyOf();

      // Act
      sectionFields().onBodyTableFieldDrop(dropFromPalette(ENTRY_DATE), body);

      // Assert
      expect(body.fields.length).toBe(2);
      expect(emitted.length).toBe(1);
    });

    it('removes a column through its remove button without selecting it', () => {
      // Arrange
      // Act
      click(query('.table-column .chip-btn.remove'));

      // Assert
      expect(bodyOf().fields.map(f => [f.dataBinding, f.sortOrder])).toEqual([['entry.hours', 0]]);
      expect(activeField()).toBeNull();
      expect(emitted.length).toBe(1);
    });

    it('adds a formula column and selects it', () => {
      // Arrange
      // Act
      click(query('.add-formula-column'));

      // Assert
      const added = bodyOf().fields[2];
      expect(added.type).toBe(ReportFieldType.Formula);
      expect(added.dataBinding).toMatch(/^formula\./);
      expect(added.sortOrder).toBe(2);
      expect(activeField()).toBe(added);
      expect(query('.formula-column .formula-prefix')).not.toBeNull();
    });

    it('stores the sort direction of a column and maps none to undefined', () => {
      // Arrange
      const select = query<HTMLSelectElement>('.sort-select')!;

      // Act
      select.value = 'desc';
      select.dispatchEvent(new Event('change'));
      const desc = bodyOf().fields[0].sortDirection;
      select.value = 'none';
      select.dispatchEvent(new Event('change'));

      // Assert
      expect(desc).toBe('desc');
      expect(bodyOf().fields[0].sortDirection).toBeUndefined();
      expect(emitted.length).toBe(2);
    });
  });

  describe('table rules', () => {
    it('offers only non-numeric, non-image and non-formula columns for grouping', () => {
      // Arrange
      bodyOf().fields.push(
        createField('expense.amount', { type: ReportFieldType.Currency }),
        createField('client.photo', { type: ReportFieldType.Image }),
        createField('formula.x', { type: ReportFieldType.Formula }),
      );

      // Act
      const groupable = rules().getGroupableFields(bodyOf());

      // Assert
      expect(groupable.map(f => f.dataBinding)).toEqual(['entry.date']);
    });

    it('sets the group column, shows the subtotal switch and clears subtotals with the group', () => {
      // Arrange
      const select = query<HTMLSelectElement>('.section-group-by select')!;
      select.value = 'entry.date';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const subtotals = query<HTMLInputElement>('.section-group-subtotals input')!;
      subtotals.checked = true;
      subtotals.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Act
      rules().setGroupBy(bodyOf(), '');
      fixture.detectChanges();

      // Assert
      expect(bodyOf().groupBy).toBeUndefined();
      expect(bodyOf().groupSubtotals).toBeUndefined();
      expect(query('.section-group-subtotals')).toBeNull();
      expect(emitted.length).toBe(3);
    });

    it('keeps subtotals when a group column is set', () => {
      // Arrange
      rules().toggleGroupSubtotals(bodyOf(), true);

      // Act
      rules().setGroupBy(bodyOf(), 'entry.date');

      // Assert
      expect(bodyOf().groupBy).toBe('entry.date');
      expect(bodyOf().groupSubtotals).toBe(true);
    });

    it('stores a row filter only when it is not blank', () => {
      // Arrange
      // Act
      rules().setRowFilter(bodyOf(), '   ');
      const blank = bodyOf().rowFilter;
      rules().setRowFilter(bodyOf(), ' hours > 2 ');

      // Assert
      expect(blank).toBeUndefined();
      expect(bodyOf().rowFilter).toBe(' hours > 2 ');
      expect(emitted.length).toBe(2);
    });

    it('rates the row filter as empty, error, unknown parameter or valid', () => {
      // Arrange
      render(current(), { parameterKeys: ['region'] });
      const body = bodyOf();

      // Act
      const empty = rules().getRowFilterStatus(body);
      body.rowFilter = 'das ist keine formel';
      const error = rules().getRowFilterStatus(body);
      body.rowFilter = 'output 1, hours > param_other';
      const unknown = rules().getRowFilterStatus(body);
      const unknownName = rules().findUnknownParameterReference(body.rowFilter);
      body.rowFilter = 'output 1, hours > param_region';
      const valid = rules().getRowFilterStatus(body);

      // Assert
      expect([empty, error, unknown, valid]).toEqual(['empty', 'error', 'unknownParameter', 'valid']);
      expect(unknownName).toBe('param_other');
    });

    it('shows the row filter status next to the input', () => {
      // Arrange
      // Act
      typeInto(query('.section-row-filter input'), 'output 1, hours > param_missing');

      // Assert
      expect(query('.filter-status')!.classList).toContain('status-warning');
      expect(text('.filter-status')).toContain('param_missing');
    });
  });

  describe('table footer', () => {
    it('toggles the table footer on and off', () => {
      // Arrange
      const checkbox = query<HTMLInputElement>('.table-footer-toggle input')!;

      // Act
      checkbox.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const enabled = bodyOf().tableFooterFields;
      const selectShown = query('.footer-field-select') !== null;
      tableFooter().toggleTableFooter(bodyOf());

      // Assert
      expect(enabled).toEqual([]);
      expect(selectShown).toBe(true);
      expect(bodyOf().tableFooterFields).toBeUndefined();
      expect(emitted.length).toBe(2);
    });

    it('offers footer sums without page layout fields and only those not yet added', () => {
      // Arrange
      const body = bodyOf();
      body.tableFooterFields = [];

      // Act
      const available = tableFooter().getAvailableFooterFields().map(f => f.key);
      tableFooter().addTableFooterFieldByKey(body, 'sum.hours');
      const remaining = tableFooter().getFooterFieldNotYetAdded(body).map(f => f.key);

      // Assert
      expect(available).toEqual(['sum.hours', 'sum.surcharges', 'sum.workDays']);
      expect(remaining).toEqual(['sum.surcharges', 'sum.workDays']);
    });

    it('adds a footer sum under its target column in bold and ignores unknown and empty keys', () => {
      // Arrange
      const body = bodyOf();
      body.tableFooterFields = [];

      // Act
      tableFooter().addTableFooterFieldByKey(body, '');
      tableFooter().addTableFooterFieldByKey(body, 'unknown');
      tableFooter().addTableFooterFieldByKey(body, 'sum.hours');
      tableFooter().addTableFooterField(body, SUM_HOURS);

      // Assert
      expect(body.tableFooterFields!.length).toBe(1);
      expect(body.tableFooterFields![0].sortOrder).toBe(1);
      expect(body.tableFooterFields![0].style.bold).toBe(true);
      expect(state().isTableFooterField(body.tableFooterFields![0])).toBe(true);
      expect(state().isBodyTableField(body.tableFooterFields![0])).toBe(false);
      expect(emitted.length).toBe(2);
    });

    it('adds a footer sum through the select and resets the select', () => {
      // Arrange
      bodyOf().tableFooterFields = [];
      refresh();
      const select = query<HTMLSelectElement>('.footer-field-select')!;

      // Act
      select.value = 'sum.surcharges';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Assert
      expect(bodyOf().tableFooterFields!.map(f => f.dataBinding)).toEqual(['sum.surcharges']);
      expect(select.value).toBe('');
      expect(text('.table-footer-fields .field-chip .chip-label')).toBe('setting.report.field.sumSurcharges');
    });

    it('removes a footer field and clears it as active field', () => {
      // Arrange
      const body = bodyOf();
      body.tableFooterFields = [];
      tableFooter().addTableFooterFieldByKey(body, 'sum.hours');
      fixture.detectChanges();
      click(query('.table-footer-fields .field-chip'));
      expect(activeField()).toBe(body.tableFooterFields![0]);
      expect(query('.tb-toggle')).not.toBeNull();

      // Act
      click(query('.table-footer-fields .field-chip .chip-btn.remove'));

      // Assert
      expect(body.tableFooterFields).toEqual([]);
      expect(activeField()).toBeNull();
    });

    it('adds a formula footer field, offers the sorted table columns and stores the chosen column', () => {
      // Arrange
      const body = bodyOf();
      body.tableFooterFields = [];
      body.fields.reverse();
      refresh();

      // Act
      click(query('.formula-add-btn'));
      const formulaField = body.tableFooterFields![0];
      const options = tableFooter().getFormulaFooterColumnOptions(formulaField);
      const columnSelect = queryAll<HTMLSelectElement>('.global-toolbar select.tb-select')
        .find(s => s.title === 'setting.report.designer.formulaColumn')!;
      columnSelect.value = '1';
      columnSelect.dispatchEvent(new Event('change'));

      // Assert
      expect(activeField()).toBe(formulaField);
      expect(formulaField.style.bold).toBe(true);
      expect(options).toEqual([{ index: 0, label: 'Date' }, { index: 1, label: 'Hours' }]);
      expect(formulaField.sortOrder).toBe(1);
      expect(tableFooter().getFormulaFooterColumnOptions(bodyOf().fields[0])).toEqual([]);
      expect(emitted.length).toBe(2);
    });
  });

  describe('page footer', () => {
    it('adds a dropped footer field once and re-orders footer chips', () => {
      // Arrange
      const footer = footerOf();

      // Act
      sectionFields().onFooterFieldDrop(dropFromPalette(SUM_HOURS));
      sectionFields().onFooterFieldDrop(dropFromPalette(SUM_HOURS));
      sectionFields().onFooterFieldDrop(reorderWithin(0, 1));

      // Assert
      expect(footer.fields.map(f => [f.dataBinding, f.sortOrder])).toEqual([['sum.hours', 0], ['report.pageNumber', 1]]);
      expect(emitted.length).toBe(3);
    });

    it('selects and removes a page footer chip', () => {
      // Arrange
      click(query('.field-chips .field-chip'));
      expect(activeField()).toBe(footerOf().fields[0]);

      // Act
      click(query('.field-chips .field-chip .chip-btn.remove'));

      // Assert
      expect(footerOf().fields).toEqual([]);
      expect(activeField()).toBeNull();
      expect(query('.section-drop-zone:not(.is-table) .drop-placeholder')).not.toBeNull();
    });
  });

  describe('free text rows', () => {
    it('adds, edits and removes a free text row below a table', () => {
      // Arrange
      click(query('.free-text-section .btn-add-row'));
      const row = bodyOf().freeTextRows![0];

      // Act
      typeInto(query('.free-text-input'), 'Signed');
      const position = query<HTMLSelectElement>('.free-text-row select')!;
      position.value = 'before';
      position.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const afterEdit = { ...row };
      click(query('.free-text-row .chip-btn.remove'));

      // Assert
      expect(afterEdit.text).toBe('Signed');
      expect(afterEdit.position).toBe('before');
      expect(bodyOf().freeTextRows).toEqual([]);
      expect(emitted.length).toBe(4);
    });
  });

  describe('formula editor', () => {
    const openEditorOnNewColumn = () => {
      click(query('.add-formula-column'));
      click(query('.formula-edit-btn'));
    };

    it('opens from the toolbar with the formula tab and closes on an overlay click only', () => {
      // Arrange
      openEditorOnNewColumn();
      expect(query('.formula-editor-modal')).not.toBeNull();
      expect(formula().formulaTabId()).toBe('formula');

      // Act
      click(query('.formula-editor-modal'));
      const stillOpen = query('.formula-editor-modal') !== null;
      click(query('.formula-editor-overlay'));

      // Assert
      expect(stillOpen).toBe(true);
      expect(query('.formula-editor-modal')).toBeNull();
      expect(formula().showFormulaEditor).toBe(false);
    });

    it('writes formula and name into the field, validates and tests the formula', () => {
      // Arrange
      openEditorOnNewColumn();
      const field = activeField()!;
      const expectedResult = TestBed.inject(FormulaEvaluationService).evaluateFormula(FORMULA, {});

      // Act
      typeInto(query('.formula-editor-name input'), 'Total');
      typeInto(query('.formula-textarea'), FORMULA);
      click(query('.formula-editor-test .btn-add-row'));

      // Assert
      expect(field.name).toBe('Total');
      expect(field.formula).toBe(FORMULA);
      expect(query('.formula-editor-test .formula-status')!.classList).toContain('status-valid');
      expect(expectedResult).not.toBe('');
      expect(text('.formula-test-result')).toBe(`= ${expectedResult}`);
      expect(emitted.length).toBe(3);
    });

    it('loads the manual once when the explanations tab is opened', () => {
      // Arrange
      openEditorOnNewColumn();
      const tabs = queryAll('.formula-tab-btn');

      // Act
      click(tabs[2]);
      click(tabs[1]);
      click(tabs[2]);

      // Assert
      expect(manualLoader.loadManual).toHaveBeenCalledTimes(1);
      expect(query('.manual-content')!.innerHTML).toBe('<p>manual</p>');
      expect(query('app-property-grid')).not.toBeNull();
      expect(tabs[2].classList).toContain('active');
    });

    it('shows the formula status in the toolbar', () => {
      // Arrange
      click(query('.add-formula-column'));

      // Act
      const status = query('.global-toolbar .formula-status')!;

      // Assert
      expect(status.classList).toContain('status-empty');
      expect(status.textContent).toContain('setting.report.designer.noFormula');
    });

    it('edits the formula name inline in the toolbar', () => {
      // Arrange
      click(query('.add-formula-column'));
      const nameInput = queryAll<HTMLInputElement>('.global-toolbar input[type="text"]')[0];

      // Act
      typeInto(nameInput, 'Net');

      // Assert
      expect(bodyOf().fields[2].name).toBe('Net');
      expect(text('.formula-column .column-name')).toBe('Net');
    });
  });

  it('keeps the component instance as the public designer API', () => {
    // Arrange
    // Act
    const instance = designer();

    // Assert
    expect(instance).toBeInstanceOf(ReportDesignerComponent);
  });
});
