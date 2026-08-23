// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ReportDataProviderService } from './report-data-provider.service';
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
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { getAllFieldsForDataSet } from 'src/app/domain/models/report/report-data-source.model';

const PHONE_TYPE = 1;
const EMAIL_TYPE = 4;

describe('ReportDataProviderService', () => {
  let service: ReportDataProviderService;
  let shiftService: { readShiftList: ReturnType<typeof vi.fn> };
  let clientService: {
    readClientList: ReturnType<typeof vi.fn>;
    getClient: ReturnType<typeof vi.fn>;
    readClientTypeTemplateList: ReturnType<typeof vi.fn>;
  };
  let groupService: {
    readGroupList: ReturnType<typeof vi.fn>;
    getGroup: ReturnType<typeof vi.fn>;
    getPathToNode: ReturnType<typeof vi.fn>;
    getGroupTree: ReturnType<typeof vi.fn>;
  };
  let calendarSelectionService: { getList: ReturnType<typeof vi.fn> };
  let qualificationService: { getQualificationList: ReturnType<typeof vi.fn> };
  let contractService: { getList: ReturnType<typeof vi.fn> };
  let clientAvailabilityService: {
    getClients: ReturnType<typeof vi.fn>;
    getAvailabilityRanges: ReturnType<typeof vi.fn>;
    getAvailabilityTotals: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    shiftService = { readShiftList: vi.fn(() => of({ shifts: [{ name: 'A' }], maxItems: 1 })) };
    clientService = {
      readClientList: vi.fn(() => of({ clients: [], maxItems: 0 })),
      getClient: vi.fn(() => of({ addresses: [] })),
      readClientTypeTemplateList: vi.fn(() => of([
        { type: 0, name: 'Mitarbeiter' },
        { type: 1, name: 'Extern' },
        { type: 2, name: 'Kunde' },
      ])),
    };
    groupService = {
      readGroupList: vi.fn(() => of({ groups: [], maxItems: 0 })),
      getGroup: vi.fn(() => of({ id: 'g1', name: 'Nord', groupItems: [] })),
      getPathToNode: vi.fn(() => of([])),
      getGroupTree: vi.fn(() => of({ rootId: 'g1', nodes: [] })),
    };
    calendarSelectionService = { getList: vi.fn(() => of([])) };
    qualificationService = { getQualificationList: vi.fn(() => of([])) };
    contractService = { getList: vi.fn(() => of([])) };
    clientAvailabilityService = {
      getClients: vi.fn(() => of({ clients: [], totalCount: 0 })),
      getAvailabilityRanges: vi.fn(() => of([])),
      getAvailabilityTotals: vi.fn(() => of([])),
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        ReportDataProviderService,
        { provide: DataWorkScheduleService, useValue: {} },
        { provide: DataBreakPlaceholderService, useValue: {} },
        { provide: DataClientService, useValue: clientService },
        { provide: DataGroupService, useValue: groupService },
        { provide: DataShiftService, useValue: shiftService },
        { provide: DataContainerTemplateService, useValue: {} },
        { provide: DataQualificationService, useValue: qualificationService },
        { provide: DataContractService, useValue: contractService },
        { provide: DataClientAvailabilityService, useValue: clientAvailabilityService },
        { provide: DataCalendarSelectionService, useValue: calendarSelectionService },
        { provide: AbsenceLookupService, useValue: {} },
        {
          provide: ClientConfigService, useValue: {
            communicationTypePhoneList: () => [{ type: PHONE_TYPE, category: 0 }],
            communicationTypeEmailList: () => [{ type: EMAIL_TYPE, category: 1 }],
          }
        },
      ],
    });
    service = TestBed.inject(ReportDataProviderService);
  });

  it.each([
    ['shift-table', ShiftFilterType.Original],
    ['shift-table-cut', ShiftFilterType.Shift],
    ['shift-table-container', ShiftFilterType.Container],
  ])('fetches %s with its shift filter type', async (sourceId, filterType) => {
    const provider = service.getProvider(sourceId as string, ['shifts']);
    const data = await provider.fetchData({});

    expect(shiftService.readShiftList).toHaveBeenCalledWith(
      expect.objectContaining({ filterType })
    );
    expect(data.rows).toEqual([{ name: 'A' }]);
  });

  it('prints along the screen filter but enforces full pagination and the source filter type', async () => {
    const screenFilter = {
      searchString: 'früh',
      orderBy: 'abbreviation',
      sortOrder: 'desc',
      numberOfItemsPerPage: 5,
      requiredPage: 3,
      isSealedOrder: true,
      filterType: ShiftFilterType.Original,
    };

    const provider = service.getProvider('shift-table-cut', ['shifts']);
    await provider.fetchData({ shiftFilter: screenFilter as never });

    expect(shiftService.readShiftList).toHaveBeenCalledWith(
      expect.objectContaining({
        searchString: 'früh',
        orderBy: 'abbreviation',
        sortOrder: 'desc',
        isSealedOrder: true,
        numberOfItemsPerPage: 10000,
        requiredPage: 0,
        filterType: ShiftFilterType.Shift,
      })
    );
    expect(screenFilter.numberOfItemsPerPage).toBe(5);
    expect(screenFilter.requiredPage).toBe(3);
    expect(screenFilter.filterType).toBe(ShiftFilterType.Original);
  });

  it('prints the address list along the screen filter with full pagination', async () => {
    const screenFilter = { searchString: 'meier', orderBy: 'firstName', sortOrder: 'desc', numberOfItemsPerPage: 5, requiredPage: 2 };

    const provider = service.getProvider('all-address', ['clients']);
    await provider.fetchData({ clientFilter: screenFilter as never });

    expect(clientService.readClientList).toHaveBeenCalledWith(
      expect.objectContaining({
        searchString: 'meier',
        orderBy: 'firstName',
        sortOrder: 'desc',
        numberOfItemsPerPage: 10000,
        requiredPage: 0,
      })
    );
    expect(screenFilter.numberOfItemsPerPage).toBe(5);
  });

  it('prints only the checked rows like the excel export', async () => {
    clientService.readClientList.mockReturnValue(
      of({ clients: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], maxItems: 3 })
    );
    const provider = service.getProvider('all-address', ['clients']);

    const included = await provider.fetchData({
      clientSelection: { selectAll: false, invertedSelection: false, selection: ['a', 'c'] },
    });
    expect(included.rows.map((r: { id: string }) => r.id)).toEqual(['a', 'c']);

    const inverted = await provider.fetchData({
      clientSelection: { selectAll: false, invertedSelection: true, selection: ['b'] },
    });
    expect(inverted.rows.map((r: { id: string }) => r.id)).toEqual(['a', 'c']);

    const all = await provider.fetchData({
      clientSelection: { selectAll: true, invertedSelection: false, selection: [] },
    });
    expect(all.rows.length).toBe(3);
  });

  it('resolves the client type via the type-template lookup, not typeAbbreviation or the raw number', async () => {
    clientService.readClientList.mockReturnValue(
      of({ clients: [{ id: 'a', type: 1 }, { id: 'b', type: 2 }], maxItems: 2 })
    );
    const provider = service.getProvider('all-address', ['clients']);

    const { rows } = await provider.fetchData({});

    expect(provider.resolveFieldValue({ dataBinding: 'client.list.type' } as never, rows[0])).toBe('Extern');
    expect(provider.resolveFieldValue({ dataBinding: 'client.list.type' } as never, rows[1])).toBe('Kunde');
  });

  it('prints the group list along the screen filter with full pagination', async () => {
    const screenFilter = { searchString: 'nord', formerDateRange: true, numberOfItemsPerPage: 5 };

    const provider = service.getProvider('group', ['groups']);
    await provider.fetchData({ groupFilter: screenFilter as never });

    expect(groupService.readGroupList).toHaveBeenCalledWith(
      expect.objectContaining({
        searchString: 'nord',
        formerDateRange: true,
        numberOfItemsPerPage: 10000,
        requiredPage: 0,
      })
    );
    expect(screenFilter.numberOfItemsPerPage).toBe(5);
  });

  it('offers formula variables for shift rows', () => {
    const provider = service.getProvider('shift-table-cut', ['shifts']);

    const vars = provider.buildFormulaVariables!({ name: 'Früh', abbreviation: 'F', workTime: 8.5 });
    expect(vars).toEqual(
      expect.objectContaining({ name: 'Früh', abbreviation: 'F', workTime: 8.5 })
    );

    const footer = provider.buildFooterFormulaVariables!([{ workTime: 8 }, { workTime: 9 }]);
    expect(footer).toEqual(expect.objectContaining({ totalRows: 2, totalWorkTime: 17 }));
  });

  it('offers formula variables for address detail rows', () => {
    const provider = service.getProvider('edit-address', ['details']);

    const vars = provider.buildFormulaVariables!({ type: 2, zip: '8004', city: 'Zürich' });
    expect(vars).toEqual(expect.objectContaining({ type: 2, zip: '8004', city: 'Zürich' }));
    expect(provider.buildFooterFormulaVariables!([{}])).toEqual(
      expect.objectContaining({ totalRows: 1 })
    );
  });

  it('collects the labels that are translated while rendering', () => {
    const allAddress = service.getProvider('all-address', ['clients']);
    expect(allAddress.collectResolvedLabelTexts!()).toEqual(['general.male', 'general.female']);

    const editAddress = service.getProvider('edit-address', ['details']);
    expect(editAddress.collectResolvedLabelTexts!()).toEqual(
      expect.arrayContaining([
        'address.type.company',
        'address.type.invoice',
        'address.type.home',
        'address.edit-address.membership.type.employee',
        'address.edit-address.qualifications.level.1',
        'general.yes',
        'general.no',
      ])
    );
  });

  describe('edit-address header fields', () => {
    // Mirrors the real GET Clients/{id} response: communications carry only a numeric `type`
    // (isPhone/isEmail are populated client-side by CommunicationService, never by the API), and
    // clientContracts carry only `contractId` — the `contract` navigation is never populated.
    const client = {
      type: 0,
      addresses: [],
      communications: [
        { type: PHONE_TYPE, value: '0791111111' },
        { type: EMAIL_TYPE, value: 'a@klacks.ch' },
      ],
      membership: { validFrom: new Date('2020-01-15') },
      clientContracts: [
        { contractId: 'ct1', fromDate: new Date('2020-01-15'), untilDate: undefined, isActive: true },
        { contractId: undefined, fromDate: new Date('2020-01-01'), isActive: false },
      ],
      groupItems: [
        { groupName: 'Team A', validFrom: new Date('2020-01-15'), validUntil: undefined },
      ],
      qualifications: [
        { qualificationId: 'q1', level: 3 },
      ],
      annotations: [
        { note: 'Wichtige Notiz' },
        { note: '  ' },
      ],
      clientImage: { imageData: 'AAAA', contentType: 'image/png' },
    };

    const contractCatalog = [{ id: 'ct1', name: 'Vollzeit' }];
    const qualificationCatalog = [{ id: 'q1', name: { de: 'Erste Hilfe' } }];

    function resolveAll(bindings: string[]): Record<string, string> {
      const provider = service.getProvider('edit-address', ['details']);
      const result: Record<string, string> = {};
      for (const dataBinding of bindings) {
        result[dataBinding] = provider.resolveHeaderValue(
          { dataBinding } as never,
          { client, metadata: { qualifications: qualificationCatalog, contracts: contractCatalog } } as never
        );
      }
      return result;
    }

    it('fetches the client together with the qualification and contract catalogs', async () => {
      const provider = service.getProvider('edit-address', ['details']);
      clientService.getClient.mockReturnValue(of(client));
      qualificationService.getQualificationList.mockReturnValue(of(qualificationCatalog));
      contractService.getList.mockReturnValue(of(contractCatalog));

      const data = await provider.fetchData({ clientId: 'c1' });

      expect(clientService.getClient).toHaveBeenCalledWith('c1');
      expect(qualificationService.getQualificationList).toHaveBeenCalled();
      expect(contractService.getList).toHaveBeenCalled();
      expect(data.metadata?.['qualifications']).toEqual(qualificationCatalog);
      expect(data.metadata?.['contracts']).toEqual(contractCatalog);
    });

    it('resolves phones, emails, employment type and entry date from the real DTO shape (type-based, not isPhone/isEmail)', () => {
      const values = resolveAll(['client.phones', 'client.emails', 'client.employmentType', 'client.entryDate']);
      expect(values['client.phones']).toBe('(079) 111 11 11');
      expect(values['client.emails']).toBe('a@klacks.ch');
      expect(values['client.employmentType']).toBe('address.edit-address.membership.type.employee');
      expect(values['client.entryDate']).not.toBe('');
    });

    it('builds multi-line summaries for contracts, groups, qualifications and notes', () => {
      const values = resolveAll([
        'client.contractsSummary',
        'client.groupsSummary',
        'client.qualificationsSummary',
        'client.notesSummary',
      ]);
      expect(values['client.contractsSummary']).toContain('Vollzeit');
      expect(values['client.contractsSummary'].split('\n')).toHaveLength(2);
      expect(values['client.groupsSummary']).toContain('Team A');
      expect(values['client.qualificationsSummary']).toContain('Erste Hilfe');
      expect(values['client.notesSummary']).toContain('Wichtige Notiz');
    });

    it('resolves the contract name via the contractId lookup, not via a populated contract navigation', () => {
      const values = resolveAll(['client.contractsSummary']);
      expect(values['client.contractsSummary']).toContain('Vollzeit: 15.01.2020 (');
    });

    it('prefixes each summary with its translated label so stacked blocks stay distinguishable', () => {
      const values = resolveAll(['client.contractsSummary', 'client.groupsSummary', 'client.qualificationsSummary', 'client.notesSummary']);
      expect(values['client.contractsSummary'].split('\n')[0]).toBe('setting.report.field.clientContractsSummary:');
      expect(values['client.groupsSummary'].split('\n')[0]).toBe('setting.report.field.clientGroupsSummary:');
      expect(values['client.qualificationsSummary'].split('\n')[0]).toBe('setting.report.field.clientQualificationsSummary:');
      expect(values['client.notesSummary'].split('\n')[0]).toBe('setting.report.field.clientNotesSummary:');
    });

    it('omits the label entirely when a summary has no content', () => {
      const emptyClient = { ...client, clientContracts: [], groupItems: [], qualifications: [], annotations: [] };
      const provider = service.getProvider('edit-address', ['details']);
      const value = provider.resolveHeaderValue(
        { dataBinding: 'client.contractsSummary' } as never,
        { client: emptyClient, metadata: { qualifications: [], contracts: [] } } as never
      );
      expect(value).toBe('');
    });

    it('resolves the client photo as a base64 data URI', () => {
      const values = resolveAll(['client.photo']);
      expect(values['client.photo']).toBe('data:image/png;base64,AAAA');
    });

    function resolveWithVisibility(bindings: string[], cardVisibility: Record<string, boolean>): Record<string, string> {
      const provider = service.getProvider('edit-address', ['details']);
      const result: Record<string, string> = {};
      for (const dataBinding of bindings) {
        result[dataBinding] = provider.resolveHeaderValue(
          { dataBinding } as never,
          { client, metadata: { qualifications: qualificationCatalog, contracts: contractCatalog, cardVisibility } } as never
        );
      }
      return result;
    }

    it('hides address rows when the persona card is collapsed', async () => {
      const provider = service.getProvider('edit-address', ['details']);
      clientService.getClient.mockReturnValue(of({ ...client, addresses: [{ zip: '8000' }] }));
      qualificationService.getQualificationList.mockReturnValue(of([]));
      contractService.getList.mockReturnValue(of([]));

      const data = await provider.fetchData({ clientId: 'c1', cardVisibility: { persona: false } });

      expect(data.rows).toEqual([]);
    });

    it('keeps address rows when the persona card is expanded (or unspecified)', async () => {
      const provider = service.getProvider('edit-address', ['details']);
      clientService.getClient.mockReturnValue(of({ ...client, addresses: [{ zip: '8000' }] }));
      qualificationService.getQualificationList.mockReturnValue(of([]));
      contractService.getList.mockReturnValue(of([]));

      const data = await provider.fetchData({ clientId: 'c1' });

      expect(data.rows).toEqual([{ zip: '8000' }]);
    });

    it('empties phones/emails/photo/summaries for collapsed cards but keeps them for expanded ones', () => {
      const values = resolveWithVisibility(
        ['client.phones', 'client.emails', 'client.photo', 'client.employmentType', 'client.entryDate',
          'client.contractsSummary', 'client.groupsSummary', 'client.qualificationsSummary', 'client.notesSummary'],
        { persona: false, membership: false, contracts: false, groups: true, qualifications: false, note: false, image: false }
      );
      expect(values['client.phones']).toBe('');
      expect(values['client.emails']).toBe('');
      expect(values['client.photo']).toBe('');
      expect(values['client.employmentType']).toBe('');
      expect(values['client.entryDate']).toBe('');
      expect(values['client.contractsSummary']).toBe('');
      expect(values['client.groupsSummary']).toContain('Team A');
      expect(values['client.qualificationsSummary']).toBe('');
      expect(values['client.notesSummary']).toBe('');
    });

    it('always resolves the client name regardless of the persona card visibility', () => {
      const provider = service.getProvider('edit-address', ['details']);
      const value = provider.resolveHeaderValue(
        { dataBinding: 'client.name' } as never,
        { client: { ...client, name: 'Muster' }, metadata: { cardVisibility: { persona: false } } } as never
      );
      expect(value).toBe('Muster');
    });
  });

  describe('client availability providers', () => {
    it('falls back to a default filter when the screen filter is missing so the designer preview still loads rows', async () => {
      clientAvailabilityService.getClients.mockReturnValue(
        of({
          clients: [
            { id: 'a', name: 'Muster', firstName: 'Anna', company: '', legalEntity: false, idNumber: 1, groupIds: [] },
          ],
          totalCount: 1,
        })
      );

      const provider = service.getProvider('client-availability', ['clients']);

      const data = await provider.fetchData({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        groupId: 'group-1',
      });

      expect(clientAvailabilityService.getClients).toHaveBeenCalledWith(
        expect.objectContaining({
          searchString: '',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          selectedGroup: 'group-1',
          startRow: 0,
          rowCount: 10000,
        })
      );
      expect(clientAvailabilityService.getAvailabilityTotals).toHaveBeenCalledWith(
        '2026-03-01',
        '2026-03-31',
        ['a']
      );
      expect(data.rows).toEqual([
        expect.objectContaining({ id: 'a', totalHours: 0, daysWithAvailability: 0 }),
      ]);
    });

    it('prints the availability list along the screen filter with full pagination and merges the totals', async () => {
      const screenFilter = {
        searchString: 'meier',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        orderBy: 'name',
        sortOrder: 'asc',
        showEmployees: true,
        showExtern: false,
        individualSort: false,
        startRow: 40,
        rowCount: 20,
      };
      clientAvailabilityService.getClients.mockReturnValue(
        of({
          clients: [
            { id: 'a', name: 'Muster', firstName: 'Anna', company: '', legalEntity: false, idNumber: 1, groupIds: [] },
            { id: 'b', name: 'Beispiel', firstName: 'Ben', company: '', legalEntity: false, idNumber: 2, groupIds: [] },
          ],
          totalCount: 2,
        })
      );
      clientAvailabilityService.getAvailabilityTotals.mockReturnValue(
        of([{ clientId: 'a', totalHours: 12.5, daysWithAvailability: 3 }])
      );

      const provider = service.getProvider('client-availability', ['clients']);
      const data = await provider.fetchData({ clientAvailabilityFilter: screenFilter as never });

      expect(clientAvailabilityService.getClients).toHaveBeenCalledWith(
        expect.objectContaining({ searchString: 'meier', startRow: 0, rowCount: 10000 })
      );
      expect(clientAvailabilityService.getAvailabilityTotals).toHaveBeenCalledWith(
        '2026-01-01',
        '2026-01-31',
        ['a', 'b']
      );
      expect(data.rows).toEqual([
        expect.objectContaining({ id: 'a', totalHours: 12.5, daysWithAvailability: 3 }),
        expect.objectContaining({ id: 'b', totalHours: 0, daysWithAvailability: 0 }),
      ]);
      expect(screenFilter.startRow).toBe(40);
      expect(screenFilter.rowCount).toBe(20);
    });

    it('resolves availability list field values and the client total count footer', () => {
      const provider = service.getProvider('client-availability', ['clients']);
      const row = { firstName: 'Anna', name: 'Muster', company: 'Klacks AG', totalHours: 8.5, daysWithAvailability: 2 };

      expect(provider.resolveFieldValue({ dataBinding: 'client.list.name' } as never, row)).toBe('Muster');
      expect(provider.resolveFieldValue({ dataBinding: 'availability.totalHours' } as never, row)).toBe('08:30');
      expect(provider.resolveFieldValue({ dataBinding: 'availability.daysWithAvailability' } as never, row)).toBe('2');
      expect(provider.resolveFooterValue({ dataBinding: 'client.totalCount' } as never, [row, row])).toBe('2');
    });

    it('returns no availability detail rows when the client id is missing', async () => {
      const provider = service.getProvider('edit-client-availability', ['details']);

      const data = await provider.fetchData({ startDate: '2026-01-01', endDate: '2026-01-31' });

      expect(data.rows).toEqual([]);
      expect(clientAvailabilityService.getAvailabilityRanges).not.toHaveBeenCalled();
      expect(clientService.getClient).not.toHaveBeenCalled();
    });

    it('fetches the availability detail sorted by date together with the client', async () => {
      const client = { id: 'c1', name: 'Muster' };
      clientService.getClient.mockReturnValue(of(client));
      clientAvailabilityService.getAvailabilityRanges.mockReturnValue(
        of([
          { clientId: 'c1', date: '2026-01-03', ranges: '08:00-12:00' },
          { clientId: 'c1', date: '2026-01-01', ranges: '14:00-18:00' },
        ])
      );

      const provider = service.getProvider('edit-client-availability', ['details']);
      const data = await provider.fetchData({ clientId: 'c1', startDate: '2026-01-01', endDate: '2026-01-31' });

      expect(clientAvailabilityService.getAvailabilityRanges).toHaveBeenCalledWith('2026-01-01', '2026-01-31', ['c1']);
      expect(clientService.getClient).toHaveBeenCalledWith('c1');
      expect(data.rows.map((r: { date: string }) => r.date)).toEqual(['2026-01-01', '2026-01-03']);
      expect(data.metadata?.['client']).toEqual(client);
    });

    it('converts the range string into hours for the detail rows', () => {
      const provider = service.getProvider('edit-client-availability', ['details']);
      const row = { clientId: 'c1', date: '2026-01-05', ranges: '08:00-12:00,14:00-18:00' };

      expect(provider.resolveFieldValue({ dataBinding: 'availability.hours' } as never, row)).toBe('08:00');
      expect(provider.resolveFieldValue({ dataBinding: 'availability.ranges' } as never, row)).toBe('08:00-12:00,14:00-18:00');
    });

    it('offers footer formula variables for both availability providers', () => {
      const listProvider = service.getProvider('client-availability', ['clients']);
      expect(listProvider.buildFooterFormulaVariables!([{ totalHours: 4 }, { totalHours: 6 }])).toEqual(
        expect.objectContaining({ totalRows: 2 })
      );

      const detailProvider = service.getProvider('edit-client-availability', ['details']);
      expect(
        detailProvider.buildFooterFormulaVariables!([
          { clientId: 'c1', date: '2026-01-01', ranges: '08:00-12:00' },
          { clientId: 'c1', date: '2026-01-02', ranges: '13:00-17:30' },
        ])
      ).toEqual(expect.objectContaining({ totalRows: 2, totalHours: 8.5 }));
    });
  });

  describe('group detail report', () => {
    const groupWithMembers = {
      id: 'g1',
      root: 'root1',
      name: 'Nord',
      description: '<p>Erste Zeile</p><p>Zweite Zeile</p>',
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      paymentInterval: 2,
      calendarSelectionId: 'cal1',
      clientsCount: 2,
      shiftsCount: 0,
      groupItems: [
        { id: 'i2', clientId: 'c2', validFrom: '2026-02-01', client: { idNumber: 22, company: 'B AG', firstName: 'Bea', name: 'Zwahlen' } },
        { id: 'i1', clientId: 'c1', validFrom: '2026-01-01', client: { idNumber: 11, company: 'A AG', firstName: 'Anna', name: 'Aebi' } },
      ],
    };

    it('lists the group members sorted by name and counts them in the footer', async () => {
      groupService.getGroup.mockReturnValue(of(groupWithMembers));
      const provider = service.getProvider('edit-group', ['details']);

      const { rows } = await provider.fetchData({ groupId: 'g1' });

      expect(groupService.getGroup).toHaveBeenCalledWith('g1');
      expect(rows.map((r: { client: { name: string } }) => r.client.name)).toEqual(['Aebi', 'Zwahlen']);
      expect(provider.resolveFieldValue({ dataBinding: 'groupMember.idNumber' } as never, rows[0])).toBe('11');
      expect(provider.resolveFieldValue({ dataBinding: 'groupMember.company' } as never, rows[0])).toBe('A AG');
      expect(provider.resolveFieldValue({ dataBinding: 'groupMember.firstName' } as never, rows[0])).toBe('Anna');
      expect(provider.resolveFooterValue({ dataBinding: 'groupMember.totalCount' } as never, rows)).toBe('2');
    });

    it('falls back to the first group when no group is supplied, so the designer preview is never empty', async () => {
      groupService.readGroupList.mockReturnValue(of({ groups: [{ id: 'first' }], maxItems: 1 }));
      groupService.getGroup.mockReturnValue(of(groupWithMembers));
      const provider = service.getProvider('edit-group', ['details']);

      const { rows } = await provider.fetchData({});

      expect(groupService.readGroupList).toHaveBeenCalled();
      expect(groupService.getGroup).toHaveBeenCalledWith('first');
      expect(rows.length).toBe(2);
    });

    it('renders the rich text description as plain lines instead of markup', async () => {
      groupService.getGroup.mockReturnValue(of(groupWithMembers));
      const provider = service.getProvider('edit-group', ['details']);

      const data = await provider.fetchData({ groupId: 'g1' });
      const value = provider.resolveHeaderValue(
        { dataBinding: 'group.description' } as never,
        { metadata: data.metadata }
      );

      expect(value).not.toContain('<p>');
      expect(value).toContain('Erste Zeile');
      expect(value).toContain('Zweite Zeile');
    });

    it('resolves the calendar name through the calendar list because the navigation is never populated', async () => {
      groupService.getGroup.mockReturnValue(of(groupWithMembers));
      calendarSelectionService.getList.mockReturnValue(of([{ id: 'cal1', name: 'Schweiz' }]));
      const provider = service.getProvider('edit-group', ['details']);

      const data = await provider.fetchData({ groupId: 'g1' });

      expect(
        provider.resolveHeaderValue({ dataBinding: 'group.calendarName' } as never, { metadata: data.metadata })
      ).toContain('Schweiz');
    });

    it('takes the shift and member type counts from the tree node, the only endpoint that populates them', async () => {
      groupService.getGroup.mockReturnValue(of(groupWithMembers));
      groupService.getGroupTree.mockReturnValue(of({
        rootId: 'root1',
        nodes: [{
          id: 'root1',
          name: 'Root',
          children: [{ id: 'g1', name: 'Nord', shiftsCount: 7, employeesCount: 5, externEmpsCount: 2, customersCount: 1, clientsCount: 8, children: [{ id: 'g2', name: 'Nord-Ost', clientsCount: 3 }] }],
        }],
      }));
      const provider = service.getProvider('edit-group', ['details']);

      const data = await provider.fetchData({ groupId: 'g1' });
      const context = { metadata: data.metadata };

      expect(groupService.getGroupTree).toHaveBeenCalledWith('root1');
      expect(provider.resolveHeaderValue({ dataBinding: 'group.shiftsCount' } as never, context)).toContain('7');
      expect(provider.resolveHeaderValue({ dataBinding: 'group.membersSummary' } as never, context)).toContain('5');
      expect(provider.resolveHeaderValue({ dataBinding: 'group.subGroupsSummary' } as never, context)).toContain('Nord-Ost');
    });

    it('keeps working when the tree lookup fails so a print never dies on the optional counts', async () => {
      groupService.getGroup.mockReturnValue(of(groupWithMembers));
      groupService.getGroupTree.mockReturnValue(throwError(() => new Error('tree unavailable')));
      const provider = service.getProvider('edit-group', ['details']);

      const data = await provider.fetchData({ groupId: 'g1' });

      expect(data.rows.length).toBe(2);
      expect(
        provider.resolveHeaderValue({ dataBinding: 'group.subGroupsSummary' } as never, { metadata: data.metadata })
      ).toBe('');
    });

    it('omits the shift count instead of printing a false zero when the tree node is unreachable', async () => {
      groupService.getGroup.mockReturnValue(of({ ...groupWithMembers, shiftsCount: 0 }));
      groupService.getGroupTree.mockReturnValue(of({ rootId: 'root1', nodes: [] }));
      const provider = service.getProvider('edit-group', ['details']);

      const data = await provider.fetchData({ groupId: 'g1' });

      expect(
        provider.resolveHeaderValue({ dataBinding: 'group.shiftsCount' } as never, { metadata: data.metadata })
      ).toBe('');
      expect(
        provider.resolveHeaderValue({ dataBinding: 'group.membersSummary' } as never, { metadata: data.metadata })
      ).toBe('');
    });

    it('declares every data binding the seeded backend template prints', () => {
      const seededBindings = [
        'report.customText', 'group.name', 'group.path', 'group.validFrom', 'group.validUntil',
        'group.paymentInterval', 'group.calendarName', 'group.clientsCount', 'group.shiftsCount',
        'group.description', 'group.membersSummary', 'group.subGroupsSummary',
        'groupMember.idNumber', 'groupMember.company', 'groupMember.firstName', 'groupMember.name',
        'groupMember.validFrom', 'groupMember.validUntil', 'groupMember.totalCount',
        'report.pageNumber',
      ];
      const declared = getAllFieldsForDataSet('edit-group', 'details').map(f => f.key);

      for (const binding of seededBindings) {
        expect(declared, `missing catalog entry for ${binding}`).toContain(binding);
      }
    });

    it('builds the group path from the ancestor list', async () => {
      groupService.getGroup.mockReturnValue(of(groupWithMembers));
      groupService.getPathToNode.mockReturnValue(of([{ name: 'Schweiz' }, { name: 'Nord' }]));
      const provider = service.getProvider('edit-group', ['details']);

      const data = await provider.fetchData({ groupId: 'g1' });

      expect(
        provider.resolveHeaderValue({ dataBinding: 'group.path' } as never, { metadata: data.metadata })
      ).toContain('Schweiz > Nord');
    });
  });
});
