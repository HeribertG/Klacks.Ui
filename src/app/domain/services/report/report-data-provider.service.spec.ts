// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ReportDataProviderService } from './report-data-provider.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';

const PHONE_TYPE = 1;
const EMAIL_TYPE = 4;

describe('ReportDataProviderService', () => {
  let service: ReportDataProviderService;
  let shiftService: { readShiftList: ReturnType<typeof vi.fn> };
  let clientService: { readClientList: ReturnType<typeof vi.fn>; getClient: ReturnType<typeof vi.fn> };
  let groupService: { readGroupList: ReturnType<typeof vi.fn> };
  let qualificationService: { getQualificationList: ReturnType<typeof vi.fn> };
  let contractService: { getList: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    shiftService = { readShiftList: vi.fn(() => of({ shifts: [{ name: 'A' }], maxItems: 1 })) };
    clientService = {
      readClientList: vi.fn(() => of({ clients: [], maxItems: 0 })),
      getClient: vi.fn(() => of({ addresses: [] })),
    };
    groupService = { readGroupList: vi.fn(() => of({ groups: [], maxItems: 0 })) };
    qualificationService = { getQualificationList: vi.fn(() => of([])) };
    contractService = { getList: vi.fn(() => of([])) };

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
      expect(values['client.phones']).toBe('079 111 11 11');
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
});
