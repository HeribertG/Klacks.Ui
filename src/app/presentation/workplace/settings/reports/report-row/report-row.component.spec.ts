// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { ReportTemplate, DEFAULT_PAGE_SETUP } from 'src/app/domain/models/report/report-template.model';
import { ReportType } from 'src/app/domain/models/report/report-type.enum';
import { ReportOrientation } from 'src/app/domain/models/report/report-orientation.enum';
import { ReportPageSize } from 'src/app/domain/models/report/report-page-size.enum';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { DEFAULT_SECTIONS, ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportParameter } from 'src/app/domain/models/report/report-parameter.model';
import { ReportParameterType } from 'src/app/domain/models/report/report-parameter-type.enum';
import { ReportTemplateVersion } from 'src/app/domain/models/report/report-template-version.interface';
import { REPORT_DATA_SOURCES } from 'src/app/domain/models/report/report-data-source.model';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { ReportTemplateResolverService } from 'src/app/domain/services/report/report-template-resolver.service';
import { ReportTemplateTransferService } from 'src/app/domain/services/report/report-template-transfer.service';
import { ReportCsvService } from 'src/app/domain/services/report/report-csv.service';
import { ReportXlsxService } from 'src/app/domain/services/report/report-xlsx.service';
import { ReportRowFilterService } from 'src/app/domain/services/report/report-row-filter.service';
import { FormulaEvaluationService } from 'src/app/domain/services/report/formula-evaluation.service';
import { ReportPdfService } from 'src/app/domain/services/report/report-pdf.service';
import { ReportDataProviderService } from 'src/app/domain/services/report/report-data-provider.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { DataReportExportService } from 'src/app/infrastructure/api/report/data-report-export.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { formatCompanyInstant } from 'src/app/domain/helpers/company-date-time.formatter';
import { companyTimeZone, companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { ReportRowComponent } from './report-row.component';

const STUB_TEMPLATE = '<ng-template #content></ng-template>';
const TOAST_NAME = 'report-template';
const TEMPLATE_ID = 'template-1';
const PREVIEW_URL_PREFIX = 'blob:preview-';
const XLSX_REQUEST = { fileName: 'weekly-plan', sheets: [] };

const createTemplate = (overrides: Partial<ReportTemplate> = {}): ReportTemplate => ({
  id: TEMPLATE_ID,
  name: 'Weekly plan',
  description: 'Plan of the week',
  type: ReportType.Schedule,
  sourceId: 'schedule',
  dataSetIds: ['work', 'break'],
  pageSetup: {
    orientation: ReportOrientation.Portrait,
    size: ReportPageSize.A3,
    margins: { top: 10, bottom: 11, left: 12, right: 13 },
  },
  sections: [{ type: ReportSectionType.Header, fields: [], visible: true, sortOrder: 0 }],
  ...overrides,
});

const createParameter = (overrides: Partial<ReportParameter> = {}): ReportParameter => ({
  key: 'region',
  label: 'Region',
  type: ReportParameterType.Text,
  ...overrides,
});

const createVersion = (overrides: Partial<ReportTemplateVersion> = {}): ReportTemplateVersion => ({
  savedAt: '2026-10-01T08:30:00Z',
  savedBy: 'admin',
  name: 'Older plan',
  pageSetup: {
    orientation: ReportOrientation.Landscape,
    size: ReportPageSize.Letter,
    margins: { top: 1, bottom: 2, left: 3, right: 4 },
  },
  sections: [{ type: ReportSectionType.Footer, fields: [], visible: true, sortOrder: 2 }],
  ...overrides,
});

describe('ReportRowComponent (characterization)', () => {
  let fixture: ComponentFixture<ReportRowComponent>;
  let component: ReportRowComponent;
  let calls: string[];
  let modalRefs: { close: ReturnType<typeof vi.fn>; dismiss: ReturnType<typeof vi.fn> }[];
  let previewUrlCount: number;
  let defaultTemplateId: string | null;
  let defaultsLoaded: boolean;

  let modalService: { open: ReturnType<typeof vi.fn> };
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  let translate: { currentLang: string; instant: ReturnType<typeof vi.fn> };
  let reportService: Record<string, ReturnType<typeof vi.fn>>;
  let transferService: Record<string, ReturnType<typeof vi.fn>>;
  let reportApi: Record<string, ReturnType<typeof vi.fn>>;
  let exportApi: Record<string, ReturnType<typeof vi.fn>>;
  let reportDefaults: Record<string, ReturnType<typeof vi.fn>>;
  let templateResolver: Record<string, ReturnType<typeof vi.fn>>;
  let csvService: Record<string, ReturnType<typeof vi.fn>>;
  let rowFilter: { hadEvaluationError: boolean };
  let pdfService: Record<string, ReturnType<typeof vi.fn>>;
  let provider: { fetchData: ReturnType<typeof vi.fn> };
  let dataProviderService: Record<string, ReturnType<typeof vi.fn>>;
  let groupService: { flatNodeList: { id: string; name: string }[]; initTree: ReturnType<typeof vi.fn> };
  let clientService: Record<string, ReturnType<typeof vi.fn>>;
  let manualLoader: Record<string, ReturnType<typeof vi.fn>>;
  let fetchedData: { rows: unknown[]; metadata?: Record<string, string> };

  const recorder = <T>(name: string, result?: T) =>
    vi.fn((..._args: unknown[]) => {
      calls.push(name);
      return result;
    });

  const state = () => component;
  const source = () => component;
  const params = () => component;
  const preview = () => component;
  const exporter = () => component;
  const versions = () => component;
  const session = () => component;

  const lastModal = () => modalRefs[modalRefs.length - 1];
  const flush = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    calls = [];
    modalRefs = [];
    previewUrlCount = 0;
    defaultTemplateId = null;
    defaultsLoaded = true;
    fetchedData = { rows: [{ id: 1 }] };

    modalService = {
      open: vi.fn((..._args: unknown[]) => {
        calls.push('modal.open');
        let resolveResult: () => void = () => undefined;
        let rejectResult: (reason: unknown) => void = () => undefined;
        const result = new Promise<void>((resolve, reject) => {
          resolveResult = resolve;
          rejectResult = reject;
        });
        const ref = {
          result,
          close: vi.fn(() => resolveResult()),
          dismiss: vi.fn((reason: unknown) => rejectResult(reason)),
        };
        modalRefs.push(ref);
        return ref;
      }),
    };
    toast = {
      showSuccess: recorder('toast.success'),
      showError: recorder('toast.error'),
      showInfo: recorder('toast.info'),
    };
    translate = { currentLang: 'de', instant: vi.fn((key: string) => key) };
    reportService = {
      downloadJson: recorder('downloadJson'),
      downloadCsv: recorder('downloadCsv'),
      downloadXlsx: recorder('downloadXlsx'),
      createPreviewUrl: vi.fn(() => {
        calls.push('createPreviewUrl');
        previewUrlCount++;
        return `${PREVIEW_URL_PREFIX}${previewUrlCount}`;
      }),
      revokePreviewUrl: recorder('revokePreviewUrl'),
    };
    transferService = {
      toJson: vi.fn(() => '{"json":true}'),
      buildFileName: vi.fn(() => 'weekly-plan.json'),
    };
    reportApi = {
      getAllTemplates: vi.fn(async () => []),
      createTemplate: vi.fn(async (template: ReportTemplate) => {
        calls.push('createTemplate');
        return { ...template, id: 'created-id' };
      }),
      updateTemplate: vi.fn(async (template: ReportTemplate) => {
        calls.push('updateTemplate');
        return template;
      }),
      getTemplateById: vi.fn(async () => createTemplate()),
    };
    exportApi = {
      downloadXlsx: vi.fn(async () => {
        calls.push('exportApi.downloadXlsx');
        return new Blob(['xlsx']);
      }),
    };
    reportDefaults = {
      isLoaded: vi.fn(() => defaultsLoaded),
      load: vi.fn(async () => {
        defaultsLoaded = true;
      }),
      getDefaultTemplateId: vi.fn(() => defaultTemplateId),
      setDefault: vi.fn(async () => {
        calls.push('setDefault');
      }),
    };
    templateResolver = { resolveReportType: vi.fn(() => ReportType.Absence) };
    csvService = {
      buildCsv: recorder('buildCsv', 'a;b'),
      buildBlob: vi.fn(() => new Blob(['a;b'])),
      buildFileName: vi.fn(() => 'weekly-plan.csv'),
    };
    rowFilter = { hadEvaluationError: false };
    pdfService = {
      generatePdf: vi.fn(async () => {
        calls.push('generatePdf');
        return new Blob(['pdf']);
      }),
    };
    provider = {
      fetchData: vi.fn(async () => {
        calls.push('fetchData');
        return fetchedData;
      }),
    };
    dataProviderService = { getProvider: vi.fn(() => provider) };
    groupService = { flatNodeList: [], initTree: recorder('initTree') };
    clientService = {
      getClientsForReplacement: vi.fn(() => of([{ id: 'client-1', name: 'Muster', firstName: 'Max' }])),
    };
    manualLoader = { loadManual: vi.fn(() => of('<p>manual</p>')) };

    TestBed.configureTestingModule({
      imports: [ReportRowComponent],
      providers: [
        DataManagementReportService,
        ReportXlsxService,
        { provide: NgbModal, useValue: modalService },
        { provide: ToastShowService, useValue: toast },
        { provide: TranslateService, useValue: translate },
        { provide: ReportService, useValue: reportService },
        { provide: ReportTemplateTransferService, useValue: transferService },
        { provide: DataReportApiService, useValue: reportApi },
        { provide: DataReportExportService, useValue: exportApi },
        { provide: ReportDefaultsService, useValue: reportDefaults },
        { provide: ReportTemplateResolverService, useValue: templateResolver },
        { provide: ReportCsvService, useValue: csvService },
        { provide: ReportRowFilterService, useValue: rowFilter },
        { provide: FormulaEvaluationService, useValue: {} },
        { provide: ReportPdfService, useValue: pdfService },
        { provide: ReportDataProviderService, useValue: dataProviderService },
        { provide: DataManagementGroupService, useValue: groupService },
        { provide: DataClientService, useValue: clientService },
        { provide: ManualLoaderService, useValue: manualLoader },
        { provide: LocaleService, useValue: { getLocale: () => 'de-CH' } },
      ],
    });
    TestBed.overrideComponent(ReportRowComponent, {
      set: { template: STUB_TEMPLATE, imports: [], styleUrls: [], styles: [] },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const create = (template: ReportTemplate = createTemplate()) => {
    fixture = TestBed.createComponent(ReportRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', template);
    fixture.componentRef.setInput('id', 'row-1');
    fixture.detectChanges();
  };

  const open = (template: ReportTemplate = createTemplate()) => {
    create(template);
    component.openModal();
  };

  const xlsxBuildSpy = () =>
    vi.spyOn(TestBed.inject(ReportXlsxService), 'buildRequest').mockImplementation(() => {
      calls.push('buildRequest');
      return XLSX_REQUEST;
    });

  describe('opening the modal', () => {
    it('loads the template into the editor', () => {
      // Arrange
      const parameters = [createParameter({ defaultValue: 'north' }), createParameter({ key: 'year' })];
      const template = createTemplate({ parameters });

      // Act
      open(template);

      // Assert
      expect(state().editName).toBe('Weekly plan');
      expect(state().editDescription).toBe('Plan of the week');
      expect(state().editOrientation).toBe(ReportOrientation.Portrait);
      expect(state().editPageSize).toBe(ReportPageSize.A3);
      expect(state().editMargins).toEqual({ top: 10, bottom: 11, left: 12, right: 13 });
      expect(state().editMargins).not.toBe(template.pageSetup.margins);
      expect(state().editParameters).toEqual(parameters);
      expect(state().editParameters).not.toBe(parameters);
      expect(state().parameterValues).toEqual({ region: 'north', year: '' });
      expect(state().editSourceId).toBe('schedule');
      expect(state().editDataSetIds).toEqual(['work', 'break']);
      expect(state().editTemplate.sourceId).toBe('schedule');
      expect(state().editTemplate.sections).toBe(template.sections);
      expect(state().isNew).toBe(false);
    });

    it('falls back to the default setup when the template has none', () => {
      // Arrange
      const template = createTemplate({
        id: undefined,
        isLocal: true,
        sourceId: undefined,
        dataSetIds: [],
        sections: [],
        pageSetup: undefined as unknown as ReportTemplate['pageSetup'],
      });

      // Act
      open(template);

      // Assert
      expect(state().editOrientation).toBe(ReportOrientation.Landscape);
      expect(state().editPageSize).toBe(ReportPageSize.A4);
      expect(state().editMargins).toEqual(DEFAULT_PAGE_SETUP.margins);
      expect(state().editSourceId).toBe('schedule');
      expect(state().editDataSetIds).toEqual(['work']);
      expect(state().editTemplate.pageSetup).toEqual(DEFAULT_PAGE_SETUP);
      expect(state().editTemplate.sections).toEqual(DEFAULT_SECTIONS);
      expect(state().isNew).toBe(true);
    });

    it('presets the preview range to the current company month', () => {
      // Arrange
      const today = companyToday();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      // Act
      open();

      // Assert
      expect(preview().previewFromDate).toEqual({ year: today.getFullYear(), month: today.getMonth() + 1, day: 1 });
      expect(preview().previewToDate).toEqual({ year: today.getFullYear(), month: today.getMonth() + 1, day: lastDay });
    });

    it('builds the group tree only when no group is loaded yet', () => {
      // Arrange
      create();

      // Act
      component.openModal();
      groupService.flatNodeList = [{ id: 'g1', name: 'North' }];
      component.openModal();

      // Assert
      expect(groupService.initTree).toHaveBeenCalledTimes(1);
    });

    it('opens the content template as a static extra-large modal after taking the snapshot', () => {
      // Act
      open();

      // Assert
      expect(modalService.open).toHaveBeenCalledWith(component.contentTemplate(), {
        size: 'xl',
        backdrop: 'static',
        keyboard: false,
      });
      expect(session().hasUnsavedChanges).toBe(false);
      expect(session().showDiscardConfirm()).toBe(false);
      expect(versions().versions()).toEqual([]);
    });

    it('reads the default flag before the snapshot when the defaults are already loaded', () => {
      // Arrange
      defaultTemplateId = TEMPLATE_ID;

      // Act
      open();

      // Assert
      expect(state().editIsDefault).toBe(true);
      expect(session().hasUnsavedChanges).toBe(false);
      expect(reportDefaults['load']).not.toHaveBeenCalled();
    });

    it('loads the defaults first and applies the flag after the snapshot when they are not loaded', async () => {
      // Arrange
      defaultsLoaded = false;
      defaultTemplateId = TEMPLATE_ID;

      // Act
      open();
      const before = state().editIsDefault;
      await flush();

      // Assert
      expect(before).toBe(false);
      expect(reportDefaults['load']).toHaveBeenCalledTimes(1);
      expect(state().editIsDefault).toBe(true);
      expect(session().hasUnsavedChanges).toBe(true);
    });

    it('loads the preview clients only once per row', () => {
      // Arrange
      create();

      // Act
      component.openModal();
      component.openModal();

      // Assert
      expect(clientService['getClientsForReplacement']).toHaveBeenCalledTimes(1);
      expect(component.previewClients).toEqual([{ id: 'client-1', name: 'Muster', firstName: 'Max' }]);
    });

    it('loads the manual once per language and falls back to the default language', () => {
      // Arrange
      create();

      // Act
      component.openModal();
      component.openModal();
      translate.currentLang = '';
      component.openModal();

      // Assert
      expect(manualLoader['loadManual']).toHaveBeenCalledTimes(2);
      expect(manualLoader['loadManual']).toHaveBeenNthCalledWith(1, 'report-manual', 'de');
      expect(manualLoader['loadManual']).toHaveBeenNthCalledWith(2, 'report-manual', 'en');
      expect(component.manualContent()).toBe('<p>manual</p>');
    });
  });

  describe('closing the modal', () => {
    it('emits cancelNewEvent and clears the preview when a new template is dismissed', async () => {
      // Arrange
      const cancelled = vi.fn();
      open(createTemplate({ id: undefined, isLocal: true }));
      component.cancelNewEvent.subscribe(cancelled);

      // Act
      session().closeModal();
      await flush();

      // Assert
      expect(lastModal().dismiss).toHaveBeenCalledWith('Cancel click');
      expect(cancelled).toHaveBeenCalledTimes(1);
      expect(reportService['revokePreviewUrl']).toHaveBeenCalledWith(null);
    });

    it('does not emit cancelNewEvent when an existing template is dismissed', async () => {
      // Arrange
      const cancelled = vi.fn();
      open();
      component.cancelNewEvent.subscribe(cancelled);

      // Act
      session().closeModal();
      await flush();

      // Assert
      expect(cancelled).not.toHaveBeenCalled();
    });

    it('closes right away when nothing changed', () => {
      // Arrange
      open();

      // Act
      session().requestClose();

      // Assert
      expect(lastModal().dismiss).toHaveBeenCalledWith('Cancel click');
      expect(session().showDiscardConfirm()).toBe(false);
    });

    it('asks before discarding unsaved changes', () => {
      // Arrange
      open();
      state().editName = 'Changed';

      // Act
      session().requestClose();

      // Assert
      expect(session().showDiscardConfirm()).toBe(true);
      expect(lastModal().dismiss).not.toHaveBeenCalled();
    });

    it('keeps editing or discards on the confirmation', () => {
      // Arrange
      open();
      state().editName = 'Changed';
      session().requestClose();

      // Act
      session().keepEditing();
      const keptOpen = lastModal().dismiss.mock.calls.length;
      session().requestClose();
      session().discardChanges();

      // Assert
      expect(keptOpen).toBe(0);
      expect(session().showDiscardConfirm()).toBe(false);
      expect(lastModal().dismiss).toHaveBeenCalledTimes(1);
    });

    it('treats a changed parameter list as unsaved work', () => {
      // Arrange
      open();

      // Act
      params().onParametersChange([createParameter()]);

      // Assert
      expect(session().hasUnsavedChanges).toBe(true);
    });
  });

  describe('row actions', () => {
    it('exports the template as JSON without opening the modal', () => {
      // Arrange
      create();
      const event = new Event('click');
      const stop = vi.spyOn(event, 'stopPropagation');

      // Act
      component.onExportClick(event);

      // Assert
      expect(stop).toHaveBeenCalled();
      expect(transferService['toJson']).toHaveBeenCalledWith(component.data());
      expect(reportService['downloadJson']).toHaveBeenCalledWith('{"json":true}', 'weekly-plan.json');
      expect(toast['showSuccess']).toHaveBeenCalledWith('setting.report.exported', TOAST_NAME);
      expect(modalService.open).not.toHaveBeenCalled();
    });

    it('reports a failed JSON export', () => {
      // Arrange
      create();
      transferService['toJson'].mockImplementation(() => {
        throw new Error('boom');
      });

      // Act
      component.onExportClick(new Event('click'));

      // Assert
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.error.export', TOAST_NAME);
    });

    it('emits duplicate and delete without propagating the click', () => {
      // Arrange
      create();
      const duplicated = vi.fn();
      const deleted = vi.fn();
      component.duplicateEvent.subscribe(duplicated);
      component.isDeleteEvent.subscribe(deleted);
      const duplicateClick = new Event('click');
      const deleteClick = new Event('click');
      const stopDuplicate = vi.spyOn(duplicateClick, 'stopPropagation');
      const stopDelete = vi.spyOn(deleteClick, 'stopPropagation');

      // Act
      component.onDuplicateClick(duplicateClick);
      component.onDeleteClick(deleteClick);

      // Assert
      expect(stopDuplicate).toHaveBeenCalled();
      expect(stopDelete).toHaveBeenCalled();
      expect(duplicated).toHaveBeenCalledTimes(1);
      expect(deleted).toHaveBeenCalledTimes(1);
    });

    it('marks a local template without id as new before the modal is opened', () => {
      // Act
      create(createTemplate({ id: undefined, isLocal: true }));

      // Assert
      expect(state().isNew).toBe(true);
    });
  });

  describe('page setup', () => {
    it('clamps margins, parses text and falls back to the default for invalid input', () => {
      // Arrange
      open();

      // Act
      state().onMarginChange('top', 75);
      state().onMarginChange('bottom', -3);
      state().onMarginChange('left', '17');
      state().onMarginChange('right', 'abc');

      // Assert
      expect(state().editMargins).toEqual({ top: 60, bottom: 0, left: 17, right: 20 });
      expect(state().editTemplate.pageSetup.margins).toEqual({ top: 60, bottom: 0, left: 17, right: 20 });
    });

    it('copies orientation and size into the template', () => {
      // Arrange
      open();
      state().editOrientation = ReportOrientation.Landscape;
      state().editPageSize = ReportPageSize.B5;

      // Act
      state().onPageSetupChange();

      // Assert
      expect(state().editTemplate.pageSetup).toEqual({
        orientation: ReportOrientation.Landscape,
        size: ReportPageSize.B5,
        margins: { top: 10, bottom: 11, left: 12, right: 13 },
      });
    });
  });

  describe('data source', () => {
    const emptySections: ReportSection[] = [
      { type: ReportSectionType.Header, fields: [], visible: true, sortOrder: 0 },
      { type: ReportSectionType.WorkTable, fields: [], visible: true, sortOrder: 1 },
      { type: ReportSectionType.Footer, fields: [], visible: true, sortOrder: 2 },
    ];
    const sourceById = (id: string) => REPORT_DATA_SOURCES.find(s => s.id === id)!;

    it('selects a source with its first data set, reads the default flag and resets the sections', () => {
      // Arrange
      open();
      defaultTemplateId = TEMPLATE_ID;

      // Act
      source().selectSource(sourceById('absence-gantt'));

      // Assert
      expect(state().editSourceId).toBe('absence-gantt');
      expect(state().editDataSetIds).toEqual(['absences']);
      expect(state().editIsDefault).toBe(true);
      expect(reportDefaults['getDefaultTemplateId']).toHaveBeenLastCalledWith('absence-gantt');
      expect(state().editTemplate.sourceId).toBe('absence-gantt');
      expect(state().editTemplate.dataSetIds).toEqual(['absences']);
      expect(state().editTemplate.sections).toEqual(emptySections);
      expect(source().selectedSource?.id).toBe('absence-gantt');
      expect(source().selectedSourceDataSets.map(ds => ds.id)).toEqual(['absences']);
    });

    it('replaces the data set and resets the sections for a single-select source', () => {
      // Arrange
      open(createTemplate({ sourceId: 'group', dataSetIds: ['groups'] }));
      const dataSet = sourceById('group').dataSets[0];

      // Act
      source().toggleDataSet(dataSet);

      // Assert
      expect(state().editDataSetIds).toEqual(['groups']);
      expect(state().editTemplate.sections).toEqual(emptySections);
    });

    it('adds and removes data sets of a multi-select source but keeps the last one', () => {
      // Arrange
      open(createTemplate({ dataSetIds: ['work'] }));
      const sections = state().editTemplate.sections;
      const schedule = sourceById('schedule');
      const work = schedule.dataSets.find(ds => ds.id === 'work')!;
      const breaks = schedule.dataSets.find(ds => ds.id === 'break')!;

      // Act
      source().toggleDataSet(breaks);
      const afterAdd = [...state().editDataSetIds];
      source().toggleDataSet(work);
      const afterRemove = [...state().editDataSetIds];
      source().toggleDataSet(breaks);

      // Assert
      expect(afterAdd).toEqual(['work', 'break']);
      expect(afterRemove).toEqual(['break']);
      expect(state().editDataSetIds).toEqual(['break']);
      expect(state().editTemplate.dataSetIds).toEqual(['break']);
      expect(state().editTemplate.sections).toBe(sections);
    });
  });

  describe('parameters', () => {
    it('merges the defaults of new parameters below the values already entered', () => {
      // Arrange
      open(createTemplate({ parameters: [createParameter({ defaultValue: 'north' })] }));
      params().setParameterValue('region', 'south');

      // Act
      params().onParametersChange([
        createParameter({ defaultValue: 'north' }),
        createParameter({ key: 'year', defaultValue: '2026' }),
        createParameter({ key: '' }),
      ]);

      // Assert
      expect(state().parameterValues).toEqual({ region: 'south', year: '2026', '': '' });
      expect(params().parameterKeys).toEqual(['region', 'year']);
      expect(params().parameterContext).toEqual({
        parameters: state().editParameters,
        values: state().parameterValues,
      });
    });
  });

  describe('saving', () => {
    it('refuses an empty name', async () => {
      // Arrange
      open();
      state().editName = '   ';

      // Act
      await session().saveReport();

      // Assert
      expect(state().isNameValid).toBe(false);
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.error.nameRequired', TOAST_NAME);
      expect(reportApi['updateTemplate']).not.toHaveBeenCalled();
    });

    it('refuses unusable parameter keys', async () => {
      // Arrange
      open(createTemplate({ parameters: [createParameter(), createParameter()] }));

      // Act
      await session().saveReport();

      // Assert
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.parameter.invalidKeys', TOAST_NAME);
      expect(reportApi['updateTemplate']).not.toHaveBeenCalled();
      expect(session().isSaving()).toBe(false);
    });

    it('creates a new template, adopts its id and resets the dirty state', async () => {
      // Arrange
      open(createTemplate({ id: undefined, isLocal: true, parameters: [createParameter()] }));
      state().editName = '  New plan  ';
      state().editDescription = '  Description  ';

      // Act
      await session().saveReport();

      // Assert
      expect(reportApi['createTemplate']).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New plan',
          description: 'Description',
          type: ReportType.Absence,
          sourceId: 'schedule',
          dataSetIds: ['work', 'break'],
          pageSetup: {
            orientation: ReportOrientation.Portrait,
            size: ReportPageSize.A3,
            margins: { top: 10, bottom: 11, left: 12, right: 13 },
          },
          parameters: [createParameter()],
        }),
      );
      expect(templateResolver['resolveReportType']).toHaveBeenCalledWith('schedule', ReportType.Schedule);
      expect(state().editTemplate.id).toBe('created-id');
      expect(state().isNew).toBe(false);
      expect(session().hasUnsavedChanges).toBe(false);
      expect(session().isSaving()).toBe(false);
      expect(toast['showSuccess']).toHaveBeenCalledWith('setting.report.saved', TOAST_NAME);
      expect(lastModal().close).not.toHaveBeenCalled();
    });

    it('updates an existing template and closes the modal when asked to', async () => {
      // Arrange
      open();

      // Act
      await session().saveReport(true);

      // Assert
      expect(reportApi['updateTemplate']).toHaveBeenCalledWith(expect.objectContaining({ id: TEMPLATE_ID }));
      expect(reportApi['createTemplate']).not.toHaveBeenCalled();
      expect(lastModal().close).toHaveBeenCalledTimes(1);
    });

    it('sets the template as default for its source when the flag was switched on', async () => {
      // Arrange
      open();
      state().editIsDefault = true;

      // Act
      await session().saveReport();

      // Assert
      expect(reportDefaults['setDefault']).toHaveBeenCalledWith('schedule', TEMPLATE_ID);
      expect(calls.indexOf('updateTemplate')).toBeLessThan(calls.indexOf('setDefault'));
      expect(calls.indexOf('setDefault')).toBeLessThan(calls.indexOf('toast.success'));
    });

    it('clears the default when the flag was switched off', async () => {
      // Arrange
      defaultTemplateId = TEMPLATE_ID;
      open();
      state().editIsDefault = false;

      // Act
      await session().saveReport();

      // Assert
      expect(reportDefaults['setDefault']).toHaveBeenCalledWith('schedule', null);
    });

    it('leaves the defaults alone when the flag did not change', async () => {
      // Arrange
      defaultTemplateId = TEMPLATE_ID;
      open();

      // Act
      await session().saveReport();

      // Assert
      expect(reportDefaults['setDefault']).not.toHaveBeenCalled();
    });

    it('reports a failed save and keeps the modal open', async () => {
      // Arrange
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      open();
      state().editName = 'Changed';
      reportApi['updateTemplate'].mockRejectedValue(new Error('offline'));

      // Act
      await session().saveReport(true);

      // Assert
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.error.save', TOAST_NAME);
      expect(session().isSaving()).toBe(false);
      expect(session().hasUnsavedChanges).toBe(true);
      expect(lastModal().close).not.toHaveBeenCalled();
    });
  });

  describe('preview', () => {
    it('requires the date range only for sources that need it', () => {
      // Arrange
      open();

      // Act
      preview().previewToDate = null;
      const scheduleWithoutEnd = preview().canGeneratePreview;
      source().selectSource(REPORT_DATA_SOURCES.find(s => s.id === 'group')!);
      const groupWithoutEnd = preview().canGeneratePreview;

      // Assert
      expect(scheduleWithoutEnd).toBe(false);
      expect(groupWithoutEnd).toBe(true);
      expect(preview().sourcePreviewConfig).toEqual({ needsGroup: false, needsDateRange: false, needsClient: false });
    });

    it('falls back to a date-range config for unknown sources', () => {
      // Arrange
      open(createTemplate({ sourceId: 'edit-group', dataSetIds: ['details'] }));

      // Act
      const config = preview().sourcePreviewConfig;

      // Assert
      expect(config).toEqual({ needsGroup: false, needsDateRange: true, needsClient: false });
    });

    it('asks for missing required parameters before fetching anything', async () => {
      // Arrange
      open(createTemplate({
        parameters: [createParameter({ required: true }), createParameter({ key: 'year', label: '', required: true })],
      }));

      // Act
      await preview().generatePreview();

      // Assert
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.parameter.missing: Region, year', TOAST_NAME);
      expect(provider.fetchData).not.toHaveBeenCalled();
    });

    it('fetches the data, renders the PDF and shows it', async () => {
      // Arrange
      groupService.flatNodeList = [{ id: 'g1', name: 'North' }];
      open();
      preview().previewGroupId = 'g1';
      preview().previewClientId = 'client-1';
      preview().previewFromDate = { year: 2026, month: 3, day: 1 };
      preview().previewToDate = { year: 2026, month: 3, day: 31 };
      params().setParameterValue('x', 'y');

      // Act
      await preview().generatePreview();

      // Assert
      expect(dataProviderService['getProvider']).toHaveBeenCalledWith('schedule', ['work', 'break']);
      expect(provider.fetchData).toHaveBeenCalledWith({
        groupId: 'g1',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        clientId: 'client-1',
      });
      const context = pdfService['generatePdf'].mock.calls[0][0];
      expect(context).toEqual(expect.objectContaining({
        provider,
        data: fetchedData,
        groupName: 'North',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        imageCache: state().imageCache,
        parameterValues: { x: 'y' },
      }));
      expect(context.template).toEqual(expect.objectContaining({ name: 'Weekly plan', sourceId: 'schedule' }));
      expect(calls.filter(c => ['fetchData', 'generatePdf', 'revokePreviewUrl', 'createPreviewUrl'].includes(c)))
        .toEqual(['fetchData', 'generatePdf', 'revokePreviewUrl', 'createPreviewUrl']);
      expect(preview().previewSource()).not.toBeNull();
      expect(preview().isGenerating()).toBe(false);
    });

    it('prefers the period reported by the data and passes undefined for empty filters', async () => {
      // Arrange
      fetchedData = { rows: [], metadata: { startDate: '2026-01-01', endDate: '2026-01-31' } };
      open(createTemplate({ sourceId: 'group', dataSetIds: ['groups'] }));
      preview().previewFromDate = null;
      preview().previewToDate = null;

      // Act
      await preview().generatePreview();

      // Assert
      expect(provider.fetchData).toHaveBeenCalledWith({
        groupId: undefined,
        startDate: undefined,
        endDate: undefined,
        clientId: undefined,
      });
      const context = pdfService['generatePdf'].mock.calls[0][0];
      expect(context.groupName).toBe('');
      expect(context.startDate).toBe('2026-01-01');
      expect(context.endDate).toBe('2026-01-31');
    });

    it('warns once about a failing row filter after rendering', async () => {
      // Arrange
      rowFilter.hadEvaluationError = true;
      open();

      // Act
      await preview().generatePreview();

      // Assert
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.error.rowFilter', TOAST_NAME);
      expect(calls.indexOf('generatePdf')).toBeLessThan(calls.indexOf('toast.error'));
      expect(calls.indexOf('toast.error')).toBeLessThan(calls.indexOf('createPreviewUrl'));
    });

    it('revokes the previous preview and opens the current one in a new tab', async () => {
      // Arrange
      const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);
      open();

      // Act
      preview().openPreviewInNewTab();
      await preview().generatePreview();
      await preview().generatePreview();
      preview().openPreviewInNewTab();

      // Assert
      expect(reportService['revokePreviewUrl']).toHaveBeenLastCalledWith(`${PREVIEW_URL_PREFIX}1`);
      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(`${PREVIEW_URL_PREFIX}2`, '_blank');
    });

    it('reports a failed preview', async () => {
      // Arrange
      open();
      pdfService['generatePdf'].mockRejectedValue(new Error('render'));

      // Act
      await preview().generatePreview();

      // Assert
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.error.preview', TOAST_NAME);
      expect(preview().isGenerating()).toBe(false);
      expect(preview().previewSource()).toBeNull();
    });

    it('does not generate while a generation is running', async () => {
      // Arrange
      open();
      preview().isGenerating.set(true);

      // Act
      await preview().generatePreview();
      await exporter().exportCsv();
      await exporter().exportXlsx();

      // Assert
      expect(preview().canGeneratePreview).toBe(false);
      expect(provider.fetchData).not.toHaveBeenCalled();
    });
  });

  describe('exports', () => {
    it('exports the preview data as CSV', async () => {
      // Arrange
      rowFilter.hadEvaluationError = true;
      open();

      // Act
      await exporter().exportCsv();

      // Assert
      expect(csvService['buildCsv']).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Weekly plan' }),
        provider,
        fetchedData,
        { parameters: [], values: {} },
      );
      expect(reportService['downloadCsv']).toHaveBeenCalledWith(expect.any(Blob), 'weekly-plan.csv');
      expect(calls.filter(c => ['fetchData', 'buildCsv', 'toast.error', 'downloadCsv'].includes(c)))
        .toEqual(['fetchData', 'buildCsv', 'toast.error', 'downloadCsv']);
      expect(preview().isGenerating()).toBe(false);
    });

    it('exports the preview data as XLSX rendered by the server', async () => {
      // Arrange
      rowFilter.hadEvaluationError = true;
      const buildRequest = xlsxBuildSpy();
      open();

      // Act
      await exporter().exportXlsx();

      // Assert
      expect(buildRequest).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Weekly plan' }),
        provider,
        fetchedData,
        { parameters: [], values: {} },
      );
      expect(exportApi['downloadXlsx']).toHaveBeenCalledWith(XLSX_REQUEST);
      expect(reportService['downloadXlsx']).toHaveBeenCalledWith(expect.any(Blob), 'weekly-plan.xlsx');
      expect(calls.filter(c => ['fetchData', 'buildRequest', 'exportApi.downloadXlsx', 'toast.error', 'downloadXlsx'].includes(c)))
        .toEqual(['fetchData', 'buildRequest', 'exportApi.downloadXlsx', 'toast.error', 'downloadXlsx']);
    });

    it('reports failed exports', async () => {
      // Arrange
      xlsxBuildSpy();
      open();
      exportApi['downloadXlsx'].mockRejectedValue(new Error('server'));
      csvService['buildCsv'].mockImplementation(() => {
        throw new Error('csv');
      });

      // Act
      await exporter().exportCsv();
      await exporter().exportXlsx();

      // Assert
      expect(toast['showError']).toHaveBeenCalledTimes(2);
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.error.export', TOAST_NAME);
      expect(reportService['downloadCsv']).not.toHaveBeenCalled();
      expect(reportService['downloadXlsx']).not.toHaveBeenCalled();
      expect(preview().isGenerating()).toBe(false);
    });
  });

  describe('version history', () => {
    it('loads the stored versions newest first', async () => {
      // Arrange
      const older = createVersion({ name: 'older' });
      const newer = createVersion({ name: 'newer' });
      reportApi['getTemplateById'].mockResolvedValue(createTemplate({ versions: [older, newer] }));
      open();

      // Act
      const loading = versions().loadVersions();
      const busy = versions().isLoadingVersions();
      await loading;

      // Assert
      expect(busy).toBe(true);
      expect(reportApi['getTemplateById']).toHaveBeenCalledWith(TEMPLATE_ID);
      expect(versions().versions().map(v => v.name)).toEqual(['newer', 'older']);
      expect(versions().isLoadingVersions()).toBe(false);
    });

    it('skips loading for unsaved templates and while a load is running', async () => {
      // Arrange
      open(createTemplate({ id: undefined, isLocal: true }));

      // Act
      await versions().loadVersions();
      state().editTemplate = { ...state().editTemplate, id: TEMPLATE_ID };
      versions().isLoadingVersions.set(true);
      await versions().loadVersions();

      // Assert
      expect(reportApi['getTemplateById']).not.toHaveBeenCalled();
    });

    it('reports a failed load with an empty list', async () => {
      // Arrange
      open();
      versions().versions.set([createVersion()]);
      reportApi['getTemplateById'].mockRejectedValue(new Error('offline'));

      // Act
      await versions().loadVersions();

      // Assert
      expect(versions().versions()).toEqual([]);
      expect(toast['showError']).toHaveBeenCalledWith('setting.report.error.versions', TOAST_NAME);
      expect(versions().isLoadingVersions()).toBe(false);
    });

    it('copies a version into the editor without saving it', () => {
      // Arrange
      open();
      const version = createVersion();

      // Act
      versions().restoreVersion(version);

      // Assert
      expect(state().editName).toBe('Older plan');
      expect(state().editOrientation).toBe(ReportOrientation.Landscape);
      expect(state().editPageSize).toBe(ReportPageSize.Letter);
      expect(state().editMargins).toEqual({ top: 1, bottom: 2, left: 3, right: 4 });
      expect(state().editTemplate.name).toBe('Older plan');
      expect(state().editTemplate.pageSetup.margins).toEqual({ top: 1, bottom: 2, left: 3, right: 4 });
      expect(state().editTemplate.sections).toEqual(version.sections);
      expect(state().editTemplate.sections).not.toBe(version.sections);
      expect(toast['showInfo']).toHaveBeenCalledWith('setting.report.versionRestored', TOAST_NAME);
      expect(reportApi['updateTemplate']).not.toHaveBeenCalled();
    });

    it('keeps the current page setup when the version has none', () => {
      // Arrange
      open();
      const version = createVersion({ pageSetup: undefined as unknown as ReportTemplateVersion['pageSetup'], sections: undefined as unknown as ReportSection[] });

      // Act
      versions().restoreVersion(version);

      // Assert
      expect(state().editOrientation).toBe(ReportOrientation.Portrait);
      expect(state().editPageSize).toBe(ReportPageSize.A3);
      expect(state().editMargins).toEqual({ top: 10, bottom: 11, left: 12, right: 13 });
      expect(state().editTemplate.sections).toEqual([]);
    });

    it('formats the version date in the company time zone', () => {
      // Arrange
      create();
      const version = createVersion();

      // Act
      const formatted = versions().formatVersionDate(version);

      // Assert
      expect(formatted).toBe(formatCompanyInstant(version.savedAt, 'dateTime', 'de-CH', companyTimeZone()) ?? '');
    });
  });
});
