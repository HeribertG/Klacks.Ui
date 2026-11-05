// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';
import { DataAuthService } from 'src/app/infrastructure/api/data-auth.service';
import { SessionStore } from 'src/app/infrastructure/storage/session-store.service';
import { environment } from 'src/environments/environment';
import { CredentialedFetchService } from './credentialed-fetch.service';

const URL = `${environment.baseUrl}assistant/chat/stream`;
const FOREIGN_URL = 'https://foreign.example.test/api/backend/assistant/chat/stream';

describe('CredentialedFetchService', () => {
  let service: CredentialedFetchService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let renewSession: ReturnType<typeof vi.fn>;
  let hasSession: boolean;

  beforeEach(() => {
    hasSession = true;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renewSession = vi.fn().mockResolvedValue(SessionRenewalOutcome.Renewed);
    TestBed.configureTestingModule({
      providers: [
        { provide: DataAuthService, useValue: { renewSession } },
        { provide: SessionStore, useValue: { hasSession: () => hasSession } },
      ],
    });
    service = TestBed.inject(CredentialedFetchService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends credentials and the CSRF header, keeps the caller headers and never sets Authorization', async () => {
    fetchMock.mockResolvedValue({ status: 200 });

    await service.fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

    const init = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(init.credentials).toBe('include');
    expect(init.headers[X_REQUESTED_WITH_HEADER]).toBe(X_REQUESTED_WITH_VALUE);
    expect(init.headers['Content-Type']).toBe('application/json');
    expect('Authorization' in init.headers).toBe(false);
    expect(renewSession).not.toHaveBeenCalled();
  });

  it('renews the session once on a 401 and repeats the call once', async () => {
    fetchMock.mockResolvedValueOnce({ status: 401 }).mockResolvedValueOnce({ status: 200 });

    const response = await service.fetch(URL, { method: 'POST', body: '{}' });

    expect(response.status).toBe(200);
    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1] as RequestInit).credentials).toBe('include');
  });

  it('hands the 401 back when the renewal is rejected or unavailable', async () => {
    fetchMock.mockResolvedValue({ status: 401 });

    renewSession.mockResolvedValueOnce(SessionRenewalOutcome.Rejected);
    expect((await service.fetch(URL)).status).toBe(401);

    renewSession.mockResolvedValueOnce(SessionRenewalOutcome.Unavailable);
    expect((await service.fetch(URL)).status).toBe(401);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not renew in a tab without a local session', async () => {
    hasSession = false;
    fetchMock.mockResolvedValue({ status: 401 });

    expect((await service.fetch(URL)).status).toBe(401);
    expect(renewSession).not.toHaveBeenCalled();
  });

  it('fetches a URL outside the own API plainly, without credentials, CSRF header or renewal', async () => {
    fetchMock.mockResolvedValue({ status: 401 });
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };

    const response = await service.fetch(FOREIGN_URL, init);

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(sent.credentials).toBeUndefined();
    expect(sent.headers[X_REQUESTED_WITH_HEADER]).toBeUndefined();
    expect(renewSession).not.toHaveBeenCalled();
  });
});
