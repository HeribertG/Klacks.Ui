// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ScenarioVariantSourceShiftService } from './scenario-variant-source-shift.service';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { Group } from 'src/app/domain/models/group/group-class';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IShiftListFilter } from 'src/app/domain/models/shift/shift-list-filter.interface';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';

const variant: IScenarioVariant = {
  id: 'variant-1',
  name: 'Winter key',
  groupId: 'group-1',
  fromDate: '2026-11-02',
  untilDate: '2026-11-29',
  token: 'variant-token-1',
  status: AnalyseScenarioStatus.Active,
  isExpired: false,
  shiftCount: 0,
};

const node = (id: string, parent?: string): Group => new Group({ id, name: `Group ${id}`, parent });

const shiftIn = (id: string, name: string, ...groupIds: string[]): IShift =>
  ({ id, name, groups: groupIds.map((groupId) => node(groupId)) }) as unknown as IShift;

describe('ScenarioVariantSourceShiftService', () => {
  let readShiftList: ReturnType<typeof vi.fn>;
  let groupService: { flatNodeList: Group[] };
  let service: ScenarioVariantSourceShiftService;

  const pagesByGroup = (pages: Record<string, IShift[]>): void => {
    readShiftList.mockImplementation((filter: IShiftListFilter) =>
      of({ shifts: pages[filter.selectedGroup ?? ''] ?? [], maxItems: 0 }),
    );
  };

  const filters = (): IShiftListFilter[] => readShiftList.mock.calls.map((call) => call[0] as IShiftListFilter);

  const load = (key: IScenarioVariant = variant): string[] => {
    let ids: string[] = [];
    service.loadSealedShifts(key).subscribe((shifts) => (ids = shifts.map((shift) => shift.id ?? '')));
    return ids;
  };

  beforeEach(() => {
    readShiftList = vi.fn();
    groupService = { flatNodeList: [node('group-1'), node('group-1-a', 'group-1'), node('group-1-a-x', 'group-1-a'), node('group-2')] };
    pagesByGroup({ 'group-1': [shiftIn('s-1', 'Early', 'group-1'), shiftIn('s-2', 'Late', 'group-1')] });

    TestBed.configureTestingModule({
      providers: [
        { provide: DataShiftService, useValue: { readShiftList } },
        { provide: DataManagementGroupService, useValue: groupService },
      ],
    });
    service = TestBed.inject(ScenarioVariantSourceShiftService);
  });

  it('asks for the sealed orders valid in the key period, in one page per group', () => {
    // Act
    service.loadSealedShifts(variant).subscribe();

    // Assert
    const filter = filters()[0];
    expect(filter.filterType).toBe(ShiftFilterType.Original);
    expect(filter.isSealedOrder).toBe(true);
    expect(filter.validFrom).toEqual(new Date(2026, 10, 2));
    expect(filter.validUntil).toEqual(new Date(2026, 10, 29));
    expect(filter.requiredPage).toBe(0);
    expect(filter.numberOfItemsPerPage).toBeGreaterThanOrEqual(1000);
  });

  it('lets the period alone decide, so a shift that ended before today still shows for a key with a past period', () => {
    // Act
    service.loadSealedShifts(variant).subscribe();

    // Assert
    filters().forEach((filter) => {
      expect(filter.activeDateRange).toBe(true);
      expect(filter.formerDateRange).toBe(true);
      expect(filter.futureDateRange).toBe(true);
    });
  });

  it('reads the key group and every subgroup separately, because the list matches exactly one group', () => {
    // Act
    service.loadSealedShifts(variant).subscribe();

    // Assert
    expect(filters().map((filter) => filter.selectedGroup).sort()).toEqual(['group-1', 'group-1-a', 'group-1-a-x']);
  });

  it('reads only the key group when the group tree does not hold it', () => {
    // Arrange
    groupService.flatNodeList = [];

    // Act
    service.loadSealedShifts(variant).subscribe();

    // Assert
    expect(filters().map((filter) => filter.selectedGroup)).toEqual(['group-1']);
  });

  it('hands back the shifts of the key group and its subgroups once each, sorted by name', () => {
    // Arrange
    pagesByGroup({
      'group-1': [shiftIn('s-1', 'Late', 'group-1', 'group-1-a')],
      'group-1-a': [shiftIn('s-1', 'Late', 'group-1', 'group-1-a'), shiftIn('s-2', 'Early', 'group-1-a')],
      'group-1-a-x': [shiftIn('s-3', 'Night', 'group-1-a-x')],
    });

    // Act
    const ids = load();

    // Assert
    expect(ids).toEqual(['s-2', 's-1', 's-3']);
  });

  it('leaves out a shift without a group, which the list also returns but the copy refuses', () => {
    // Arrange
    pagesByGroup({ 'group-1': [shiftIn('s-1', 'Early', 'group-1'), shiftIn('s-2', 'Groupless')] });

    // Act
    const ids = load();

    // Assert
    expect(ids).toEqual(['s-1']);
  });

  it('leaves out a shift that also belongs to a group outside the key hierarchy, which the copy refuses', () => {
    // Arrange
    pagesByGroup({ 'group-1': [shiftIn('s-1', 'Early', 'group-1'), shiftIn('s-2', 'Shared', 'group-1', 'group-2')] });

    // Act
    const ids = load();

    // Assert
    expect(ids).toEqual(['s-1']);
  });

  it('passes a failed read on to the caller', () => {
    // Arrange
    readShiftList.mockReturnValue(throwError(() => new Error('failed')));
    const onError = vi.fn();

    // Act
    service.loadSealedShifts(variant).subscribe({ error: onError });

    // Assert
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
