// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the executeConfig outcome (W1.4): a config with onError 'continue' must not report
 * success after swallowing a step failure.
 */
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
import { IUiActionConfig, IUiActionContext } from 'src/app/domain/interfaces/ui-action-step.interface';

const CONTEXT: IUiActionContext = { params: {}, results: {}, callId: 'call-1' };

describe('UiActionEngineService executeConfig outcome', () => {
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

  it('returns succeeded for a config whose steps all pass', async () => {
    const config: IUiActionConfig = {
      steps: [{ action: 'navigate', route: '/workplace/dashboard' }],
    };

    await expect(service.executeConfig(config, CONTEXT)).resolves.toEqual({ succeeded: true });
  });

  it('returns the first failure when onError is continue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const config: IUiActionConfig = {
      steps: [
        { action: 'navigate' },
        { action: 'navigate', route: '/workplace/dashboard' },
      ],
      onError: 'continue',
    };

    const outcome = await service.executeConfig(config, CONTEXT);

    expect(outcome.succeeded).toBe(false);
    expect(outcome.failedStep).toBe('navigate');
    expect(outcome.error).toContain('route');
  });

  it('still throws when onError is stop', async () => {
    const config: IUiActionConfig = { steps: [{ action: 'navigate' }] };

    await expect(service.executeConfig(config, CONTEXT)).rejects.toThrow();
  });
});
