// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AbsenceGanttGridComponent } from './absence-gantt-grid.component';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportPdfService } from 'src/app/domain/services/report/report-pdf.service';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { ReportTemplateResolverService } from 'src/app/domain/services/report/report-template-resolver.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { DataAbsenceDetailService } from 'src/app/infrastructure/api/absence-detail/data-absence-detail.service';
import { ReportFieldType } from 'src/app/domain/models/report/report-field.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { ReportType } from 'src/app/domain/models/report/report-template.model';

const ABSENCE_ID = '11111111-1111-1111-1111-111111111111';
const ABSENCE_NAME = 'Ferien';
const ABSENCE_NAME_GREEK = 'Διακοπές';
const LANG_GREEK = 'el';
const CLIENT_ID = '22222222-2222-2222-2222-222222222222';
const CLIENT_NAME = 'André';
const CLIENT_FIRST_NAME = 'Cyril';
const DEFAULT_VALUE = 1;
const EXPECTED_VALUE = '2';
const CURRENT_YEAR = 2026;

describe('AbsenceGanttGridComponent PDF export', () => {
  let component: AbsenceGanttGridComponent;
  let fixture: ComponentFixture<AbsenceGanttGridComponent>;
  let generatePdf: ReturnType<typeof vi.fn>;

  const absence = {
    id: ABSENCE_ID,
    name: {
      de: ABSENCE_NAME,
      en: ABSENCE_NAME,
      fr: ABSENCE_NAME,
      it: ABSENCE_NAME,
      [LANG_GREEK]: ABSENCE_NAME_GREEK,
    },
    color: '#ffffff',
    defaultLength: 1,
    defaultValue: DEFAULT_VALUE,
    hideInGantt: false,
  };

  let localAbsenceList: unknown[] = [absence];
  const translate = {
    onLangChange: of({}),
    currentLang: 'de',
    instant: vi.fn().mockReturnValue(''),
    get: vi.fn().mockReturnValue(of('')),
  };

  const template = {
    name: 'Absence Report',
    description: '',
    type: ReportType.Absence,
    sourceId: 'absence-gantt',
    dataSetIds: ['absences'],
    sections: [
      {
        type: ReportSectionType.WorkTable,
        visible: true,
        sortOrder: 0,
        fields: [
          { name: 'Abwesenheit', dataBinding: 'absence.absenceName', type: ReportFieldType.Text, width: 25, height: 0, sortOrder: 0 },
          { name: 'Wert', dataBinding: 'absence.value', type: ReportFieldType.Number, width: 10, height: 0, sortOrder: 1 },
        ],
      },
    ],
  };

  beforeEach(async () => {
    generatePdf = vi.fn().mockResolvedValue(new Blob());
    localAbsenceList = [absence];
    translate.currentLang = 'de';

    await TestBed.configureTestingModule({
      imports: [AbsenceGanttGridComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslateService, useValue: translate },
        {
          provide: DataManagementAbsenceGanttService,
          useValue: {
            absenceList: () => localAbsenceList,
            isReset: () => false,
          },
        },
        {
          provide: DataManagementBreakPlaceholderService,
          useValue: {
            clients: [
              {
                id: CLIENT_ID,
                idNumber: 1,
                company: '',
                name: CLIENT_NAME,
                firstName: CLIENT_FIRST_NAME,
                breakPlaceholders: [],
              },
            ],
            breakFilter: { currentYear: CURRENT_YEAR },
          },
        },
        { provide: ReportTemplateResolverService, useValue: { resolveForSource: () => template } },
        { provide: ReportDefaultsService, useValue: { getDefaultTemplateId: () => undefined } },
        { provide: DataAbsenceService, useValue: { readAbsenceList: () => of([absence]) } },
        { provide: DataAbsenceDetailService, useValue: { readAbsenceDetailList: () => of([]) } },
      ],
    })
      .overrideComponent(AbsenceGanttGridComponent, {
        add: {
          providers: [
            { provide: ReportPdfService, useValue: { generatePdf } },
            { provide: ReportService, useValue: { openPdfPreview: vi.fn() } },
            { provide: DataManagementReportService, useValue: { reportTemplateList: () => [], createDefaultTemplate: () => template } },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AbsenceGanttGridComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedRow', 0);
    component.selectedRowData = [
      {
        id: '33333333-3333-3333-3333-333333333333',
        absenceId: ABSENCE_ID,
        clientId: CLIENT_ID,
        from: new Date(CURRENT_YEAR, 0, 15),
        until: new Date(CURRENT_YEAR, 0, 16),
        information: '',
      } as never,
    ];
    component.ngOnInit();
  });

  it('resolves absence name and value for the exported rows', async () => {
    await component.exportToPDF();

    expect(generatePdf).toHaveBeenCalledTimes(1);
    const context = generatePdf.mock.calls[0][0];
    const row = context.data.rows[0];

    expect(
      context.provider.resolveFieldValue({ dataBinding: 'absence.absenceName' }, row)
    ).toBe(ABSENCE_NAME);
    expect(
      context.provider.resolveFieldValue({ dataBinding: 'absence.value' }, row)
    ).toBe(EXPECTED_VALUE);
  });

  it('passes the selected client and the filter period into the report context', async () => {
    await component.exportToPDF();

    const context = generatePdf.mock.calls[0][0];

    expect(context.data.clients).toHaveLength(1);
    expect(context.data.clients[0].name).toBe(CLIENT_NAME);
    expect(context.data.clients[0].firstName).toBe(CLIENT_FIRST_NAME);
    expect(context.startDate).toContain(String(CURRENT_YEAR));
    expect(context.endDate).toContain(String(CURRENT_YEAR));
  });

  it('resolves a non-latin absence name and keeps it inside the rows so the PDF font gets registered', async () => {
    translate.currentLang = LANG_GREEK;

    await component.exportToPDF();

    const context = generatePdf.mock.calls[0][0];
    const row = context.data.rows[0];

    expect(
      context.provider.resolveFieldValue({ dataBinding: 'absence.absenceName' }, row)
    ).toBe(ABSENCE_NAME_GREEK);
    expect(JSON.stringify(context.data.rows)).toContain(ABSENCE_NAME_GREEK);
  });

  it('takes the absence from the lookup even when the local absence list is still empty', async () => {
    localAbsenceList = [];
    component.ngOnInit();
    translate.currentLang = LANG_GREEK;

    await component.exportToPDF();

    const context = generatePdf.mock.calls[0][0];

    expect(context.data.rows[0].absence).toBeDefined();
    expect(JSON.stringify(context.data.rows)).toContain(ABSENCE_NAME_GREEK);
  });

  it('sums the total value in the report footer', async () => {
    await component.exportToPDF();

    const context = generatePdf.mock.calls[0][0];

    expect(
      context.provider.resolveFooterValue({ dataBinding: 'absence.totalValue' }, context.data.rows)
    ).toBe(EXPECTED_VALUE);
  });
});
