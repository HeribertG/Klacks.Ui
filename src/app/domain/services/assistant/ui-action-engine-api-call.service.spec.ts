// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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

  const runApiCall = (apiUrl: string, apiMethod = 'GET') =>
    service.executeConfig(
      { steps: [{ action: 'apiCall', apiUrl, apiMethod }] },
      { params: {}, results: {}, callId: 'c' },
    );

  it('accepts a same-origin absolute URL and requests it as a relative path', async () => {
    const promise = runApiCall(`${window.location.origin}/api/backend/Clients/1?x=2`);

    const req = httpMock.expectOne('/api/backend/Clients/1?x=2');
    req.flush({});

    await promise;
  });

  it.each([
    ['protocol-relative URL', '//evil.example.com/x'],
    ['absolute external URL', 'https://evil.example.com'],
    ['backslash host escape', '/\\evil.example.com'],
    ['backslash host escape with scheme', '\\\\evil.example.com/x'],
    ['tab-obfuscated protocol-relative URL', '/\t/evil.example.com/x'],
    ['javascript scheme', 'javascript:alert(1)'],
  ])('rejects %s', async (_label, url) => {
    await expect(runApiCall(url)).rejects.toThrow(/same-origin/);
    httpMock.expectNone(() => true);
  });

  it.each([
    '/api/backend/Assistant/chat',
    '/api/backend/assistant/plans',
    '/api/backend/Skills/execute',
    '/api/backend/Accounts/LoginUser',
    '/api/backend/Settings/anything',
    '/api/backend/GeneralSettings/GetSettingsList',
    '/api/backend/personal-access-tokens',
    '/api/backend/OAuth2/token',
    '/api/internal/Database/reset',
    '/api/admin/klacksy-training',
    '/assistant/chat',
    '/api/backend/Clients/../Assistant/chat',
    '/api/backend/%41ssistant/chat',
    '/api/backend/Clients/%2e%2e/Skills/execute',
    '/api/backend\\Skills\\execute',
    `${window.location.origin}/api/backend/Accounts/LoginUser`,
  ])('rejects denied target path %s', async url => {
    await expect(runApiCall(url, 'POST')).rejects.toThrow(/target path is not allowed/);
    httpMock.expectNone(() => true);
  });

  it('accepts a normal data path whose name merely contains a denied word', async () => {
    const promise = runApiCall('/api/backend/Clients/1');

    const req = httpMock.expectOne('/api/backend/Clients/1');
    req.flush({});

    await promise;
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
