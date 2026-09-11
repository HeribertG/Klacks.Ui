// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { DataAppVersionService } from './data-app-version.service';
import { IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';

const DEPLOYED_BUILD: IBuildInfo = { version: '1.0.28', buildKey: '9a7e4b1c0d2f' };
const FETCH_TIMEOUT_MS = 5000;

describe('DataAppVersionService', () => {
  let service: DataAppVersionService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataAppVersionService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reads the deployed build identity from version.json next to index.html, bypassing the HTTP cache', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => DEPLOYED_BUILD });

    const result = await service.fetchDeployedBuildInfo();

    expect(result).toEqual(DEPLOYED_BUILD);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/version\.json$/);
    expect(init).toMatchObject({ cache: 'no-store' });
  });

  it('returns null when the version file is missing', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    await expect(service.fetchDeployedBuildInfo()).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(service.fetchDeployedBuildInfo()).resolves.toBeNull();
  });

  it('returns null when the body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });

    await expect(service.fetchDeployedBuildInfo()).resolves.toBeNull();
  });

  it('returns null for a body that is not a build identity', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: '1.0.28' }) });

    await expect(service.fetchDeployedBuildInfo()).resolves.toBeNull();
  });

  it('gives up on a request that hangs', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );

    const pending = service.fetchDeployedBuildInfo();
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS);

    await expect(pending).resolves.toBeNull();
  });
});
