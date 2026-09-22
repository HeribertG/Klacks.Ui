// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { UiActionEngineService } from './ui-action-engine.service';
import { UiActionValueResolverService } from './ui-action-value-resolver.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SEARCH_STRATEGY } from 'src/app/domain/interfaces/search-strategy.interface';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { IUiActionConfig, IUiActionContext } from '../../interfaces/ui-action-step.interface';

describe('UiActionEngineService — cancellation', () => {
  let service: UiActionEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UiActionEngineService,
        UiActionValueResolverService,
        { provide: Router, useValue: { url: '/workplace/dashboard', navigate: vi.fn() } },
        { provide: SearchStateService, useValue: {} },
        { provide: SEARCH_STRATEGY, useValue: {} },
        { provide: KlacksyNavigationService, useValue: { navigateAndScroll: vi.fn(() => Promise.resolve({ success: true })) } },
      ],
    });
    service = TestBed.inject(UiActionEngineService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops between steps and reports cancelled once isCancelled turns true', async () => {
    let cancelled = false;
    const config: IUiActionConfig = {
      steps: [
        { action: 'delay', delay: 0 },
        { action: 'delay', delay: 0 },
        { action: 'delay', delay: 0 },
      ],
    };
    const context: IUiActionContext = {
      params: {},
      results: {},
      callId: 'call-1',
      isCancelled: () => cancelled,
    };

    const executeStepSpy = vi.spyOn(service as unknown as { executeStep: (...args: unknown[]) => Promise<void> }, 'executeStep');
    executeStepSpy.mockImplementationOnce(async () => { cancelled = true; });

    const outcome = await service.executeConfig(config, context);

    expect(executeStepSpy).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ succeeded: false, cancelled: true });
  });

  it('runs to completion normally when isCancelled is absent', async () => {
    const config: IUiActionConfig = { steps: [{ action: 'delay', delay: 0 }] };
    const context: IUiActionContext = { params: {}, results: {}, callId: 'call-1' };

    const outcome = await service.executeConfig(config, context);

    expect(outcome).toEqual({ succeeded: true });
  });
});
