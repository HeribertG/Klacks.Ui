// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { UiActionEngineService } from './ui-action-engine.service';
import { UiActionValueResolverService } from './ui-action-value-resolver.service';
import { SearchStateService } from 'src/app/domain/services/search-state.service';
import { SEARCH_STRATEGY } from 'src/app/domain/interfaces/search-strategy.interface';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { IUiActionConfig } from 'src/app/domain/interfaces/ui-action-config.interface';
import { IUiActionStep } from 'src/app/domain/interfaces/ui-action-step.interface';

describe('UiActionEngineService search step', () => {
  const SEARCH_DELAY_MS = 500;
  const ROUTE_MAP = { client: '/workplace/client', shift: '/workplace/shift' };
  const LOCATION_STEP: IUiActionStep = {
    action: 'search',
    routeKeyFrom: 'params.entityType',
    routeMap: ROUTE_MAP,
    valueFrom: 'params.searchQuery',
    entityTypeFilterFrom: 'params.entityTypeFilter',
    cityFrom: 'params.city',
    zipPrefixFrom: 'params.zipPrefix',
  };

  let service: UiActionEngineService;
  let globalSearch: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    globalSearch = vi.fn();
    navigate = vi.fn(() => Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UiActionEngineService,
        UiActionValueResolverService,
        { provide: Router, useValue: { navigate, navigateByUrl: vi.fn() } },
        { provide: SearchStateService, useValue: { setRestoreSearch: vi.fn() } },
        { provide: SEARCH_STRATEGY, useValue: { globalSearch } },
        { provide: KlacksyNavigationService, useValue: { navigateAndScroll: vi.fn() } },
      ],
    });
    service = TestBed.inject(UiActionEngineService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function run(step: IUiActionStep, params: Record<string, unknown>): Promise<void> {
    const config: IUiActionConfig = { steps: [step] };
    const execution = service.executeConfig(config, { params, results: {}, callId: 'call-1' });
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
    await execution;
  }

  it('hands the resolved city and zip prefix to the search strategy', async () => {
    await run(LOCATION_STEP, { entityType: 'shift', city: 'Bern', zipPrefix: '30' });

    expect(navigate).toHaveBeenCalledWith(['/workplace/shift']);
    expect(globalSearch).toHaveBeenCalledWith('', true, false, { city: 'Bern', zipPrefix: '30' });
  });

  it('passes empty strings for location parameters the model omitted so an earlier filter is cleared', async () => {
    await run(LOCATION_STEP, { entityType: 'shift', searchQuery: 'Nacht' });

    expect(globalSearch).toHaveBeenCalledWith('Nacht', true, false, { city: '', zipPrefix: '' });
  });

  it('keeps the address-type filter next to the location options', async () => {
    await run(LOCATION_STEP, { entityType: 'client', entityTypeFilter: 'employee', city: 'Bern' });

    expect(globalSearch).toHaveBeenCalledWith('', true, false, { typeFilter: 'employee', city: 'Bern', zipPrefix: '' });
  });

  it('passes no options at all when the step declares no location source and no type filter', async () => {
    const step: IUiActionStep = {
      action: 'search',
      routeKeyFrom: 'params.entityType',
      routeMap: ROUTE_MAP,
      valueFrom: 'params.searchQuery',
      entityTypeFilterFrom: 'params.entityTypeFilter',
    };

    await run(step, { entityType: 'client', searchQuery: 'Muster' });

    expect(globalSearch).toHaveBeenCalledWith('Muster', true, false, undefined);
  });
});
