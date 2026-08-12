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
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';

describe('ReportDataProviderService', () => {
  let service: ReportDataProviderService;
  let shiftService: { readShiftList: ReturnType<typeof vi.fn> };
  let clientService: { readClientList: ReturnType<typeof vi.fn> };
  let groupService: { readGroupList: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    shiftService = { readShiftList: vi.fn(() => of({ shifts: [{ name: 'A' }], maxItems: 1 })) };
    clientService = { readClientList: vi.fn(() => of({ clients: [], maxItems: 0 })) };
    groupService = { readGroupList: vi.fn(() => of({ groups: [], maxItems: 0 })) };

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
        { provide: AbsenceLookupService, useValue: {} },
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
    expect(editAddress.collectResolvedLabelTexts!()).toEqual([
      'address.type.company',
      'address.type.invoice',
      'address.type.home',
    ]);
  });
});
