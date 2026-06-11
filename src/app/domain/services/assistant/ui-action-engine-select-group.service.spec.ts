// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { UiActionEngineService } from './ui-action-engine.service';
import { UiActionValueResolverService } from './ui-action-value-resolver.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SEARCH_STRATEGY } from 'src/app/domain/interfaces/search-strategy.interface';
import { KlacksyNavigationService } from 'src/app/core/services/klacksy-navigation.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { IUiActionConfig } from 'src/app/domain/interfaces/ui-action-step.interface';

describe('UiActionEngineService selectGroup', () => {
  let service: UiActionEngineService;
  let groupSelection: { selectGroup: ReturnType<typeof vi.fn>; clearSelection: ReturnType<typeof vi.fn> };
  let dataGroup: { getGroupTree: ReturnType<typeof vi.fn> };

  const tree = {
    rootId: 'root',
    nodes: [
      {
        id: 'g1',
        name: 'Bern',
        children: [{ id: 'g2', name: 'Bern Nord', children: [] }],
      },
      { id: 'g3', name: 'Thun', children: [] },
    ],
  };

  beforeEach(() => {
    groupSelection = { selectGroup: vi.fn(), clearSelection: vi.fn() };
    dataGroup = { getGroupTree: vi.fn(() => of(tree)) };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UiActionEngineService,
        UiActionValueResolverService,
        { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
        { provide: SearchStateService, useValue: { setRestoreSearch: vi.fn() } },
        { provide: SEARCH_STRATEGY, useValue: { globalSearch: vi.fn() } },
        { provide: KlacksyNavigationService, useValue: { navigateAndScroll: vi.fn() } },
        { provide: GroupSelectionService, useValue: groupSelection },
        { provide: DataGroupService, useValue: dataGroup },
      ],
    });
    service = TestBed.inject(UiActionEngineService);
  });

  function configFor(groupName: string): { config: IUiActionConfig; context: { params: Record<string, unknown>; results: Record<string, unknown>; callId: string } } {
    return {
      config: { steps: [{ action: 'selectGroup', valueFrom: 'params.groupName' }] },
      context: { params: { groupName }, results: {}, callId: 'call-1' },
    };
  }

  it('selects a group by exact name', async () => {
    const { config, context } = configFor('Thun');

    await service.executeConfig(config, context);

    expect(groupSelection.selectGroup).toHaveBeenCalledWith(expect.objectContaining({ name: 'Thun' }));
  });

  it('finds nested child groups and matches case-insensitively', async () => {
    const { config, context } = configFor('bern nord');

    await service.executeConfig(config, context);

    expect(groupSelection.selectGroup).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bern Nord' }));
  });

  it('clears the selection for the all-groups value', async () => {
    const { config, context } = configFor('all');

    await service.executeConfig(config, context);

    expect(groupSelection.clearSelection).toHaveBeenCalled();
    expect(groupSelection.selectGroup).not.toHaveBeenCalled();
    expect(dataGroup.getGroupTree).not.toHaveBeenCalled();
  });

  it('throws when the group cannot be found', async () => {
    const { config, context } = configFor('Unbekannt');

    await expect(service.executeConfig(config, context)).rejects.toThrow("Group 'Unbekannt' was not found");
    expect(groupSelection.selectGroup).not.toHaveBeenCalled();
  });

  it('throws when no group name is provided', async () => {
    const { config, context } = configFor('');

    await expect(service.executeConfig(config, context)).rejects.toThrow('selectGroup action requires a group name');
  });
});
