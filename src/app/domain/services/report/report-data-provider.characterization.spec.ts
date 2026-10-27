// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ReportDataProviderService } from './report-data-provider.service';
import { ReportDataProvider } from './report-data-provider.interface';
import { LocaleService } from 'src/app/application/services/locale.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { formatCalendarDate } from 'src/app/domain/helpers/locale-date-format.helper';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { APP_PORT_BINDINGS } from 'src/app/app.port-bindings';

registerLocaleData(localeDe, 'de');

const GERMAN_LOCALE_SERVICE = { getLocale: () => 'de' } as LocaleService;

const WORK = 0;
const WORK_CHANGE = 1;
const EXPENSES = 2;
const BREAK = 3;

const field = (dataBinding: string, name = ''): never => ({ dataBinding, name }) as never;

describe('ReportDataProviderService (characterization)', () => {
  let service: ReportDataProviderService;
  let workScheduleService: { getWorkSchedule: ReturnType<typeof vi.fn> };
  let breakPlaceholderService: { getClientList: ReturnType<typeof vi.fn> };
  let containerTemplateService: { getTemplates: ReturnType<typeof vi.fn> };
  let shiftService: { readShiftList: ReturnType<typeof vi.fn> };
  let clientService: { readClientList: ReturnType<typeof vi.fn>; getClient: ReturnType<typeof vi.fn> };
  let groupService: {
    readGroupList: ReturnType<typeof vi.fn>;
    getGroup: ReturnType<typeof vi.fn>;
    getPathToNode: ReturnType<typeof vi.fn>;
    getGroupTree: ReturnType<typeof vi.fn>;
  };
  let absenceLookup: {
    loadIfNeeded: ReturnType<typeof vi.fn>;
    absences: () => { id?: string }[];
    absenceDetails: () => { id?: string }[];
    getNameForEntryId: ReturnType<typeof vi.fn>;
    findAbsenceForEntryId: ReturnType<typeof vi.fn>;
    getAbbreviationForEntryId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    workScheduleService = { getWorkSchedule: vi.fn() };
    breakPlaceholderService = { getClientList: vi.fn() };
    containerTemplateService = { getTemplates: vi.fn(() => of([])) };
    shiftService = { readShiftList: vi.fn(() => of({ shifts: [], maxItems: 0 })) };
    clientService = {
      readClientList: vi.fn(() => of({ clients: [], maxItems: 0 })),
      getClient: vi.fn(() => of({ addresses: [] })),
    };
    groupService = {
      readGroupList: vi.fn(() => of({ groups: [], maxItems: 0 })),
      getGroup: vi.fn(() => of({ id: 'g1', name: 'Nord', groupItems: [] })),
      getPathToNode: vi.fn(() => of([])),
      getGroupTree: vi.fn(() => of({ rootId: 'g1', nodes: [] })),
    };
    absenceLookup = {
      loadIfNeeded: vi.fn(() => Promise.resolve()),
      absences: () => [{ id: 'a1' }, {}],
      absenceDetails: () => [{ id: 'd1' }, {}],
      getNameForEntryId: vi.fn((id: string, lang: string) => `name:${id}:${lang}`),
      findAbsenceForEntryId: vi.fn((id: string) => (id === 'a1' ? { defaultValue: 0.5 } : undefined)),
      getAbbreviationForEntryId: vi.fn((id: string, lang: string) => `abbr:${id}:${lang}`),
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        ...APP_PORT_BINDINGS,
        { provide: LocaleService, useValue: GERMAN_LOCALE_SERVICE },
        ReportDataProviderService,
        { provide: DataWorkScheduleService, useValue: workScheduleService },
        { provide: DataBreakPlaceholderService, useValue: breakPlaceholderService },
        { provide: DataClientService, useValue: clientService },
        { provide: DataGroupService, useValue: groupService },
        { provide: DataShiftService, useValue: shiftService },
        { provide: DataContainerTemplateService, useValue: containerTemplateService },
        { provide: DataQualificationService, useValue: { getQualificationList: vi.fn(() => of([])) } },
        { provide: DataContractService, useValue: { getList: vi.fn(() => of([])) } },
        { provide: DataClientAvailabilityService, useValue: {} },
        { provide: DataCalendarSelectionService, useValue: { getList: vi.fn(() => of([])) } },
        { provide: AbsenceLookupService, useValue: absenceLookup },
        {
          provide: ClientConfigService, useValue: {
            communicationTypePhoneList: () => [],
            communicationTypeEmailList: () => [],
          }
        },
      ],
    });
    service = TestBed.inject(ReportDataProviderService);
  });

  describe('getProvider dispatch', () => {
    it('falls back to the work schedule provider for an unknown source', async () => {
      workScheduleService.getWorkSchedule.mockReturnValue(of({
        entries: [{ entryType: WORK, clientId: 'c1' }, { entryType: EXPENSES, clientId: 'c1' }],
        clients: [],
        startDate: 's',
        endDate: 'e',
      }));

      const provider = service.getProvider('unknown', ['whatever']);
      const data = await provider.fetchData({ startDate: '2026-01-01', endDate: '2026-01-31' });

      expect(data.rows).toEqual([{ entryType: WORK, clientId: 'c1' }]);
    });
  });

  describe('schedule provider', () => {
    const entries = [
      { entryType: WORK, clientId: 'c1', entryDate: '2026-01-05', changeTime: 8, surcharges: 1 },
      { entryType: WORK, clientId: 'c1', entryDate: '2026-01-05', changeTime: 2, surcharges: 0 },
      { entryType: WORK, clientId: 'c2', entryDate: '2026-01-06', changeTime: 4, surcharges: null },
      { entryType: EXPENSES, clientId: 'c1', entryDate: '2026-01-06', amount: 12.5 },
      { entryType: BREAK, clientId: 'c1', entryDate: '2026-01-07' },
      { entryType: WORK_CHANGE, clientId: 'c1', entryDate: '2026-01-08' },
    ];

    beforeEach(() => {
      workScheduleService.getWorkSchedule.mockReturnValue(of({
        entries,
        clients: [{ id: 'c1' }, { id: 'c2' }],
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }));
    });

    it('loads the absences, requests the period and keeps only the requested entry types', async () => {
      const provider = service.getProvider('schedule', ['work', 'expenses', 'unknown']);

      const data = await provider.fetchData({ startDate: '2026-01-01', endDate: '2026-01-31', groupId: 'g1' });

      expect(absenceLookup.loadIfNeeded).toHaveBeenCalled();
      expect(workScheduleService.getWorkSchedule).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        selectedGroup: 'g1',
        showEmployees: true,
        showExtern: true,
        clientId: undefined,
      });
      expect((data.rows as { entryType: number }[]).map(r => r.entryType)).toEqual([WORK, WORK, WORK, EXPENSES]);
      expect(data.clients).toEqual([{ id: 'c1' }, { id: 'c2' }]);
      expect(data.metadata).toEqual({ startDate: '2026-01-01', endDate: '2026-01-31' });
    });

    it('narrows entries and clients to the requested client', async () => {
      const provider = service.getProvider('schedule', ['work', 'break', 'workChange']);

      const data = await provider.fetchData({ startDate: '2026-01-01', endDate: '2026-01-31', clientId: 'c1' });

      expect((data.rows as { entryType: number }[]).map(r => r.entryType)).toEqual([WORK, WORK, BREAK, WORK_CHANGE]);
      expect(data.clients).toEqual([{ id: 'c1' }]);
    });

    it('resolves the entry field bindings', () => {
      const provider = service.getProvider('schedule', ['work']);
      const entry = {
        entryType: WORK,
        entryDate: '2026-01-05',
        startTime: '08:00:00',
        endTime: '16:30:00',
        changeTime: 8.5,
        surcharges: 1.25,
        entryName: 'Früh',
        abbreviation: 'F',
        information: 'Info',
        description: { de: 'Beschreibung', en: 'Description' },
        amount: 3.456,
        taxable: true,
      };
      const resolve = (binding: string, row: object = entry) => provider.resolveFieldValue(field(binding), row as never);

      expect(resolve('entry.date')).toBe('05.01.2026');
      expect(resolve('expense.date')).toBe('05.01.2026');
      expect(resolve('entry.weekday')).toBe('Mo');
      expect(resolve('entry.startTime')).toBe('08:00');
      expect(resolve('entry.endTime')).toBe('16:30');
      expect(resolve('entry.hours')).toBe('08:30');
      expect(resolve('entry.surcharges')).toBe('01:15');
      expect(resolve('entry.shiftName')).toBe('Früh');
      expect(resolve('expense.shiftName')).toBe('Früh');
      expect(resolve('entry.shiftAbbr')).toBe('F');
      expect(resolve('entry.type')).toBe('schedule.entryType.work');
      expect(resolve('entry.information')).toBe('Info');
      expect(resolve('entry.description')).toBe('Description');
      expect(resolve('expense.description')).toBe('Description');
      expect(resolve('expense.amount')).toBe('3.46');
      expect(resolve('expense.taxable')).toBe('general.yes');
      expect(resolve('expense.taxable', { ...entry, taxable: false })).toBe('general.no');
      expect(resolve('expense.taxable', { ...entry, taxable: null })).toBe('');
      expect(resolve('expense.amount', { ...entry, amount: null })).toBe('');
      expect(resolve('entry.description', { ...entry, description: null })).toBe('');
      expect(resolve('entry.startTime', { ...entry, startTime: '' })).toBe('');
      expect(resolve('entry.date', { ...entry, entryDate: undefined })).toBe('');
      expect(resolve('unknown.binding')).toBe('');
    });

    it('labels every entry type', () => {
      const provider = service.getProvider('schedule', ['work']);
      const label = (entryType: number) => provider.resolveFieldValue(field('entry.type'), { entryType } as never);

      expect(label(WORK)).toBe('schedule.entryType.work');
      expect(label(WORK_CHANGE)).toBe('schedule.entryType.workChange');
      expect(label(BREAK)).toBe('schedule.entryType.break');
      expect(label(EXPENSES)).toBe('schedule.entryType.expenses');
      expect(label(4)).toBe('');
    });

    it('derives the abbreviation per entry type and work change type', () => {
      const provider = service.getProvider('schedule', ['work']);
      const abbr = (row: object) => provider.resolveFieldValue(field('entry.shiftAbbr'), row as never);

      expect(abbr({ entryType: EXPENSES, taxable: true })).toBe('workChange.abbr.reimbursement');
      expect(abbr({ entryType: EXPENSES, taxable: false })).toBe('workChange.abbr.expenses');
      expect(abbr({ entryType: BREAK, entryId: 'a1' })).toBe('abbr:a1:en');
      expect(abbr({ entryType: WORK, abbreviation: null })).toBe('');
      const workChange = (workChangeType: number | null, replaceClientId: string | null = null) =>
        abbr({ entryType: WORK_CHANGE, workChangeType, replaceClientId });
      expect(workChange(7)).toBe('workChange.abbr.briefing');
      expect(workChange(8)).toBe('workChange.abbr.debriefing');
      expect(workChange(4)).toBe('workChange.abbr.travelStart');
      expect(workChange(5)).toBe('workChange.abbr.travelEnd');
      expect(workChange(6)).toBe('workChange.abbr.travelWithin');
      expect(workChange(2)).toBe('workChange.abbr.replacement');
      expect(workChange(3)).toBe('workChange.abbr.replacement');
      expect(workChange(9)).toBe('workChange.abbr.replacement');
      expect(workChange(0)).toBe('workChange.abbr.correction');
      expect(workChange(1)).toBe('workChange.abbr.correction');
      expect(workChange(null, 'other')).toBe('workChange.abbr.replacement');
      expect(workChange(null)).toBe('workChange.abbr.correction');
    });

    it('sums hours, surcharges, unique work days and expenses in the footer', () => {
      const provider = service.getProvider('schedule', ['work']);
      const rows = entries as never[];

      expect(provider.resolveFooterValue(field('sum.hours'), rows)).toBe('14:00');
      expect(provider.resolveFooterValue(field('sum.surcharges'), rows)).toBe('01:00');
      expect(provider.resolveFooterValue(field('sum.workDays'), rows)).toBe('2');
      expect(provider.resolveFooterValue(field('sum.expenses'), rows)).toBe('12.50');
      expect(provider.resolveFooterValue(field('sum.other'), rows)).toBe('');
    });

    it('offers row and footer formula variables', () => {
      const provider = service.getProvider('schedule', ['work']);

      expect(provider.buildFormulaVariables!({ entryDate: '2026-01-05', entryType: WORK } as never)).toEqual({
        hours: 0,
        surcharges: 0,
        startTime: '',
        endTime: '',
        weekday: 1,
        entryType: WORK,
        information: '',
        amount: 0,
        taxable: false,
      });
      expect(provider.buildFooterFormulaVariables!(entries as never[])).toEqual({
        totalRows: 6,
        totalHours: 14,
        totalSurcharges: 1,
        totalWorkDays: 2,
        totalExpenses: 12.5,
      });
    });

    it('resolves the common header bindings', () => {
      const provider = service.getProvider('schedule', ['work']);
      const context = {
        client: { name: 'Muster', firstName: 'Anna', company: 'Klacks AG', idNumber: 42 },
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        groupName: 'Nord',
      };
      const header = (binding: string, name = '', ctx: object = context) =>
        provider.resolveHeaderValue(field(binding, name), ctx as never);

      expect(header('client.name')).toBe('Muster');
      expect(header('client.firstName')).toBe('Anna');
      expect(header('client.company')).toBe('Klacks AG');
      expect(header('client.idNumber')).toBe('42');
      expect(header('report.period')).toBe('01.01.2026 - 31.01.2026');
      expect(header('report.date')).toBe(formatCalendarDate(companyToday(), 'de'));
      expect(header('report.groupName')).toBe('Nord');
      expect(header('report.customText', 'Freitext')).toBe('Freitext');
      expect(header('unknown')).toBe('');
      expect(header('client.name', '', {})).toBe('');
      expect(header('report.period', '', {})).toBe(' - ');
    });

    it('collects the weekday and schedule labels', () => {
      const provider = service.getProvider('schedule', ['work']);

      expect(provider.collectResolvedLabelTexts!()).toEqual([
        'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa',
        'general.yes',
        'general.no',
        'schedule.entryType.work',
        'schedule.entryType.workChange',
        'schedule.entryType.break',
        'schedule.entryType.expenses',
        'workChange.abbr.expenses',
        'workChange.abbr.reimbursement',
        'workChange.abbr.briefing',
        'workChange.abbr.debriefing',
        'workChange.abbr.travelStart',
        'workChange.abbr.travelEnd',
        'workChange.abbr.travelWithin',
        'workChange.abbr.replacement',
        'workChange.abbr.correction',
      ]);
    });

    describe('entry dates across browser time zones', () => {
      for (const zone of CALENDAR_TEST_ZONES) {
        describe(zone, () => {
          useTimeZone(zone);

          it('prints the date, weekday and work days of UTC-midnight wire values on their own day', () => {
            const provider = service.getProvider('schedule', ['work']);
            const row = { entryType: WORK, entryDate: '2026-01-05T00:00:00Z' };

            expect(provider.resolveFieldValue(field('entry.date'), row as never)).toBe('05.01.2026');
            expect(provider.resolveFieldValue(field('entry.weekday'), row as never)).toBe('Mo');
            expect(provider.buildFormulaVariables!(row as never)['weekday']).toBe(1);
          });
        });
      }
    });
  });

  describe('absence provider', () => {
    const response = {
      totalCount: 2,
      clients: [
        { id: 'c1', name: 'Muster', firstName: 'Anna', breakPlaceholders: [{ absenceId: 'a1', from: '2026-03-02', until: '2026-03-04', information: 'Ferien' }] },
        { id: 'c2', name: 'Beispiel', firstName: 'Ben', breakPlaceholders: undefined },
      ],
    };

    beforeEach(() => {
      breakPlaceholderService.getClientList.mockReturnValue(of(response));
    });

    it('requests all absences of the year of the start date and flattens the placeholders per client', async () => {
      const provider = service.getProvider('absence-gantt', ['absences']);

      const data = await provider.fetchData({ startDate: '2026-03-01', groupId: 'g1' });

      expect(absenceLookup.loadIfNeeded).toHaveBeenCalled();
      expect(breakPlaceholderService.getClientList).toHaveBeenCalledWith({
        currentYear: 2026,
        absences: [
          { id: 'a1', name: '', checked: true },
          { id: 'd1', name: '', checked: true },
        ],
        selectedGroup: 'g1',
        showEmployees: true,
        showExtern: true,
        searchString: '',
        orderBy: 'name',
        sortOrder: 'asc',
        numberOfItemsPerPage: 10000,
        requiredPage: 0,
        numberOfItemOnPreviousPage: undefined,
        firstItemOnLastPage: undefined,
        isPreviousPage: undefined,
        isNextPage: undefined,
        individualSort: false,
      });
      expect(data.rows).toEqual([
        { absenceId: 'a1', from: '2026-03-02', until: '2026-03-04', information: 'Ferien', clientName: 'Muster', clientFirstName: 'Anna' },
      ]);
      expect(data.clients).toEqual(response.clients);
      expect(data.metadata).toEqual({ totalClients: 2 });
    });

    it('prefers the explicit year and narrows to the requested client', async () => {
      const provider = service.getProvider('absence-gantt', ['absences']);

      const data = await provider.fetchData({ year: 2024, startDate: '2026-03-01', clientId: 'c2' });

      expect(breakPlaceholderService.getClientList).toHaveBeenCalledWith(expect.objectContaining({ currentYear: 2024 }));
      expect(data.rows).toEqual([]);
      expect(data.clients).toEqual([response.clients[1]]);
    });

    it('resolves absence fields, the day value and the footer totals', () => {
      const provider = service.getProvider('absence-gantt', ['absences']);
      const row = { absenceId: 'a1', from: '2026-03-02', until: '2026-03-04', information: 'Ferien', clientName: 'Muster', clientFirstName: 'Anna' };
      const other = { absenceId: 'x', from: '2026-03-02', until: '2026-03-04' };
      const resolve = (binding: string, r: object = row) => provider.resolveFieldValue(field(binding), r as never);

      expect(resolve('absence.clientName')).toBe('Muster');
      expect(resolve('absence.clientFirstName')).toBe('Anna');
      expect(resolve('absence.absenceName')).toBe('name:a1:en');
      expect(resolve('absence.from')).toBe('02.03.2026');
      expect(resolve('absence.until')).toBe('04.03.2026');
      expect(resolve('absence.value')).toBe('1.5');
      expect(resolve('absence.value', other)).toBe('');
      expect(resolve('absence.information')).toBe('Ferien');
      expect(resolve('absence.unknown')).toBe('');
      expect(provider.resolveFooterValue(field('absence.totalCount'), [row, other] as never[])).toBe('2');
      expect(provider.resolveFooterValue(field('absence.totalValue'), [row, row, other] as never[])).toBe('3');
      expect(provider.resolveFooterValue(field('absence.other'), [row] as never[])).toBe('');
      expect(provider.buildFormulaVariables!(row as never)).toEqual({
        fromDate: '2026-03-02',
        untilDate: '2026-03-04',
        absenceName: 'name:a1:en',
        defaultValue: 0.5,
        clientName: 'Muster',
        clientFirstName: 'Anna',
      });
      expect(provider.buildFooterFormulaVariables!([row, other] as never[])).toEqual({ totalRows: 2, totalValue: 1.5 });
      expect(provider.collectResolvedLabelTexts).toBeUndefined();
    });
  });

  describe('container template provider', () => {
    it('returns no rows without a container', async () => {
      const provider = service.getProvider('container-template', ['items']);

      expect(await provider.fetchData({})).toEqual({ rows: [] });
      expect(containerTemplateService.getTemplates).not.toHaveBeenCalled();
    });

    it('flattens the template items and falls back to the template times', async () => {
      containerTemplateService.getTemplates.mockReturnValue(of([
        {
          weekday: 1,
          fromTime: '06:00:00',
          untilTime: '14:00:00',
          containerTemplateItems: [
            { shift: { name: 'Früh' }, briefingTime: '00:15:00', debriefingTime: '00:10:00', travelTimeBefore: '00:20:00', travelTimeAfter: '00:25:00' },
            { startShift: '07:00:00', endShift: '12:00:00' },
          ],
        },
      ]));
      const provider = service.getProvider('container-template', ['items']);

      const data = await provider.fetchData({ containerId: 'k1' });
      const [first, second] = data.rows;
      const resolve = (binding: string, row: object) => provider.resolveFieldValue(field(binding), row as never);

      expect(containerTemplateService.getTemplates).toHaveBeenCalledWith('k1');
      expect(data.rows.length).toBe(2);
      expect(data.metadata).toEqual({ totalCount: 2 });
      expect(resolve('ct.weekday', first)).toBe('Mo');
      expect(resolve('ct.fromTime', first)).toBe('06:00');
      expect(resolve('ct.untilTime', first)).toBe('14:00');
      expect(resolve('ct.fromTime', second)).toBe('07:00');
      expect(resolve('ct.untilTime', second)).toBe('12:00');
      expect(resolve('ct.shiftName', first)).toBe('Früh');
      expect(resolve('ct.shiftName', second)).toBe('');
      expect(resolve('ct.briefingTime', first)).toBe('00:15');
      expect(resolve('ct.debriefingTime', first)).toBe('00:10');
      expect(resolve('ct.travelTimeBefore', first)).toBe('00:20');
      expect(resolve('ct.travelTimeAfter', first)).toBe('00:25');
      expect(resolve('ct.unknown', first)).toBe('');
      expect(provider.resolveFooterValue(field('ct.totalCount'), data.rows)).toBe('2');
      expect(provider.resolveFooterValue(field('ct.other'), data.rows)).toBe('');
      expect(provider.buildFormulaVariables).toBeUndefined();
      expect(provider.collectResolvedLabelTexts!()).toEqual(['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']);
    });
  });

  describe('list providers', () => {
    it('resolves the shift fields and the shift total', () => {
      const provider = service.getProvider('shift-table', ['shifts']);
      const row = {
        name: 'Früh', abbreviation: 'F', startShift: '06:00:00', endShift: '14:00:00',
        fromDate: '2026-01-01', untilDate: '2026-12-31', workTime: 7.75, description: 'Desc',
      };
      const resolve = (binding: string) => provider.resolveFieldValue(field(binding), row as never);

      expect(resolve('shift.name')).toBe('Früh');
      expect(resolve('shift.abbreviation')).toBe('F');
      expect(resolve('shift.startShift')).toBe('06:00');
      expect(resolve('shift.endShift')).toBe('14:00');
      expect(resolve('shift.fromDate')).toBe('01.01.2026');
      expect(resolve('shift.untilDate')).toBe('31.12.2026');
      expect(resolve('shift.workTime')).toBe('07:45');
      expect(resolve('shift.description')).toBe('Desc');
      expect(resolve('shift.unknown')).toBe('');
      expect(provider.resolveFooterValue(field('shift.totalCount'), [row, row] as never[])).toBe('2');
      expect(provider.resolveFooterValue(field('shift.other'), [row] as never[])).toBe('');
      expect(provider.resolveHeaderValue(field('report.groupName'), { groupName: 'Nord' })).toBe('Nord');
    });

    it('uses the default shift filter when the screen filter is missing', async () => {
      const provider = service.getProvider('shift-table-container', ['shifts']);

      await provider.fetchData({});

      expect(shiftService.readShiftList).toHaveBeenCalledWith({
        searchString: '',
        orderBy: 'name',
        sortOrder: 'asc',
        numberOfItemsPerPage: 10000,
        requiredPage: 0,
        numberOfItemOnPreviousPage: undefined,
        firstItemOnLastPage: undefined,
        isPreviousPage: undefined,
        isNextPage: undefined,
        activeDateRange: true,
        formerDateRange: false,
        futureDateRange: false,
        showDeleteEntries: false,
        filterType: 2,
      });
    });

    it('resolves the group list fields, the default filter and the group total', async () => {
      groupService.readGroupList.mockReturnValue(of({ groups: [{ name: 'Nord' }], maxItems: 7 }));
      const provider = service.getProvider('group', ['groups']);

      const data = await provider.fetchData({ groupId: 'g9' });
      const row = { name: 'Nord', description: 'D', validFrom: '2026-01-01', validUntil: undefined, clientsCount: 3, parentName: 'Root' };
      const resolve = (binding: string, r: object = row) => provider.resolveFieldValue(field(binding), r as never);

      expect(groupService.readGroupList).toHaveBeenCalledWith({
        searchString: '',
        orderBy: 'name',
        sortOrder: 'asc',
        numberOfItemsPerPage: 10000,
        requiredPage: 0,
        numberOfItemOnPreviousPage: undefined,
        firstItemOnLastPage: undefined,
        isPreviousPage: undefined,
        isNextPage: undefined,
        activeDateRange: true,
        formerDateRange: false,
        futureDateRange: false,
        showDeleteEntries: false,
        selectedGroup: 'g9',
      });
      expect(data).toEqual({ rows: [{ name: 'Nord' }], metadata: { totalCount: 7 } });
      expect(resolve('group.name')).toBe('Nord');
      expect(resolve('group.description')).toBe('D');
      expect(resolve('group.validFrom')).toBe('01.01.2026');
      expect(resolve('group.validUntil')).toBe('');
      expect(resolve('group.clientsCount')).toBe('3');
      expect(resolve('group.shiftsCount')).toBe('0');
      expect(resolve('group.unknown')).toBe('');
      expect(provider.resolveFooterValue(field('group.totalCount'), [row] as never[])).toBe('1');
      expect(provider.buildFormulaVariables!(row as never)).toEqual({ name: 'Nord', parentName: 'Root' });
      expect(provider.buildFooterFormulaVariables!([row] as never[])).toEqual({ totalRows: 1 });
    });

    it('resolves the address list fields, the default filter and the gender labels', async () => {
      const provider = service.getProvider('all-address', ['clients']);

      await provider.fetchData({ groupId: 'g2' });
      const row = { idNumber: 7, company: 'K AG', firstName: 'Anna', name: 'Muster', gender: 1, type: 0, birthdate: '1990-05-12' };
      const resolve = (binding: string, r: object = row) => provider.resolveFieldValue(field(binding), r as never);

      expect(clientService.readClientList).toHaveBeenCalledWith(expect.objectContaining({
        searchString: '',
        orderBy: 'name',
        sortOrder: 'asc',
        numberOfItemsPerPage: 10000,
        selectedGroup: 'g2',
        showDeleteEntries: false,
        withoutGroup: false,
        countries: [],
        employee: true,
        externEmp: true,
        customer: true,
      }));
      expect(resolve('client.list.idNumber')).toBe('7');
      expect(resolve('client.list.company')).toBe('K AG');
      expect(resolve('client.list.firstName')).toBe('Anna');
      expect(resolve('client.list.name')).toBe('Muster');
      expect(resolve('client.list.gender')).toBe('general.female');
      expect(resolve('client.list.gender', { gender: '0' })).toBe('general.male');
      expect(resolve('client.list.gender', { gender: 2 })).toBe('');
      expect(resolve('client.list.type')).toBe('address.edit-address.membership.type.employee');
      expect(resolve('client.list.type', { type: 9 })).toBe('');
      expect(resolve('client.list.birthdate')).toBe('12.05.1990');
      expect(resolve('client.list.unknown')).toBe('');
      expect(provider.resolveFooterValue(field('client.totalCount'), [row] as never[])).toBe('1');
      expect(provider.resolveFooterValue(field('client.other'), [row] as never[])).toBe('');
    });

    it('resolves the address detail fields and every address type label', async () => {
      const provider = service.getProvider('edit-address', ['details']);
      const row = { type: 1, street: 'Weg 1', street2: '', street3: 'Postfach', zip: '8000', city: 'Zürich', country: 'CH', validFrom: '2026-02-01' };
      const resolve = (binding: string, r: object = row) => provider.resolveFieldValue(field(binding), r as never);

      expect(await provider.fetchData({})).toEqual({ rows: [] });
      expect(resolve('address.type')).toBe('ADDRES_TYPE1_NAME');
      expect(resolve('address.type', { type: 0 })).toBe('ADDRES_TYPE0_NAME');
      expect(resolve('address.type', { type: 2 })).toBe('ADDRES_TYPE2_NAME');
      expect(resolve('address.type', { type: 5 })).toBe('ADDRES_TYPE_UNDEFINED');
      expect(resolve('address.street')).toBe('Weg 1, Postfach');
      expect(resolve('address.zip')).toBe('8000');
      expect(resolve('address.city')).toBe('Zürich');
      expect(resolve('address.country')).toBe('CH');
      expect(resolve('address.validFrom')).toBe('01.02.2026');
      expect(resolve('address.unknown')).toBe('');
      expect(provider.resolveFooterValue(field('anything'), [row] as never[])).toBe('');
      expect(provider.resolveHeaderValue(field('client.employmentType'), { client: { type: 2 } } as never))
        .toBe('address.edit-address.membership.type.customer');
      expect(provider.resolveHeaderValue(field('client.employmentType'), { client: { type: 7 } } as never)).toBe('');
      expect(provider.resolveHeaderValue(field('client.photo'), { client: { clientImage: { imageData: 'AA' } } } as never)).toBe('');
    });

    it('labels the payment interval of a group and falls back to monthly', async () => {
      const provider: ReportDataProvider = service.getProvider('edit-group', ['details']);
      groupService.getGroup.mockReturnValue(of({ id: 'g1', name: 'Nord', groupItems: [], paymentInterval: 0 }));
      const weekly = await provider.fetchData({ groupId: 'g1' });
      groupService.getGroup.mockReturnValue(of({ id: 'g1', name: 'Nord', groupItems: [] }));
      const fallback = await provider.fetchData({ groupId: 'g1' });

      expect(provider.resolveHeaderValue(field('group.paymentInterval'), { metadata: weekly.metadata }))
        .toBe('setting.report.field.groupPaymentInterval: settings.work.payment-weekly');
      expect(provider.resolveHeaderValue(field('group.paymentInterval'), { metadata: fallback.metadata }))
        .toBe('setting.report.field.groupPaymentInterval: settings.work.payment-monthly');
      expect(provider.resolveHeaderValue(field('group.name'), { metadata: fallback.metadata })).toBe('Nord');
      expect(provider.resolveHeaderValue(field('group.path'), { metadata: fallback.metadata }))
        .toBe('setting.report.field.groupPath: Nord');
      expect(provider.resolveHeaderValue(field('report.groupName'), { groupName: 'X', metadata: fallback.metadata })).toBe('X');
    });
  });
});
