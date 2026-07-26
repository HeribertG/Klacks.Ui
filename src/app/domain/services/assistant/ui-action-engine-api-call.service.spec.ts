// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { UiActionEngineService } from './ui-action-engine.service';
import { UiActionValueResolverService } from './ui-action-value-resolver.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SEARCH_STRATEGY } from 'src/app/domain/interfaces/search-strategy.interface';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { IUiActionConfig } from 'src/app/domain/interfaces/ui-action-step.interface';

describe('UiActionEngineService apiCall', () => {
  let service: UiActionEngineService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UiActionEngineService,
        UiActionValueResolverService,
        { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
        { provide: SearchStateService, useValue: { setRestoreSearch: vi.fn() } },
        { provide: SEARCH_STRATEGY, useValue: { globalSearch: vi.fn() } },
        { provide: KlacksyNavigationService, useValue: { navigateAndScroll: vi.fn() } },
      ],
    });
    service = TestBed.inject(UiActionEngineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('issues GET to relative apiUrl and stores response in results', async () => {
    const config: IUiActionConfig = {
      steps: [
        { action: 'apiCall', apiUrl: '/api/backend/clients/123', apiMethod: 'GET', resultKey: 'client' },
      ],
    };
    const context = { params: {}, results: {} as Record<string, unknown>, callId: 'call-1' };

    const promise = service.executeConfig(config, context);

    const req = httpMock.expectOne('/api/backend/clients/123');
    expect(req.request.method).toBe('GET');
    req.flush({ id: '123', name: 'Anna' });

    await promise;
    expect(context.results['client']).toEqual({ id: '123', name: 'Anna' });
  });

  it('substitutes {param} placeholders in apiUrl', async () => {
    const config: IUiActionConfig = {
      steps: [
        { action: 'apiCall', apiUrl: '/api/backend/clients/{id}', apiMethod: 'GET' },
      ],
    };
    const context = { params: { id: 'abc' }, results: {}, callId: 'c' };

    const promise = service.executeConfig(config, context);

    const req = httpMock.expectOne('/api/backend/clients/abc');
    req.flush({});

    await promise;
  });

  it('rejects external URLs', async () => {
    const config: IUiActionConfig = {
      steps: [
        { action: 'apiCall', apiUrl: 'https://evil.example.com/data', apiMethod: 'GET' },
      ],
    };
    const context = { params: {}, results: {}, callId: 'c' };

    await expect(service.executeConfig(config, context)).rejects.toThrow(/same-origin/);
  });

  it('posts apiBody with template substitution', async () => {
    const config: IUiActionConfig = {
      steps: [
        {
          action: 'apiCall',
          apiUrl: '/api/backend/clients',
          apiMethod: 'POST',
          apiBody: { name: '{firstName}', external: 42 },
        },
      ],
    };
    const context = { params: { firstName: 'Max' }, results: {}, callId: 'c' };

    const promise = service.executeConfig(config, context);

    const req = httpMock.expectOne('/api/backend/clients');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Max', external: 42 });
    req.flush({});

    await promise;
  });
});
