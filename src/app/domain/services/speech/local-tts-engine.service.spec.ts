// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { LocalTtsEngineService } from './local-tts-engine.service';
import { DataLocalTtsService } from 'src/app/infrastructure/api/assistant/data-local-tts.service';
import { LOCAL_TTS_KEYS, LOCAL_TTS_POLL_INTERVAL_MS } from 'src/app/domain/constants/local-tts.constants';
import { LocalTtsStatus } from 'src/app/domain/models/assistant/local-tts-status.interface';

const LICENSE_VERSION = 'openrail-m-supertonic3-3cadd1ee';

function statusFixture(overrides: Partial<LocalTtsStatus> = {}): LocalTtsStatus {
  return {
    installed: false,
    pending: false,
    lastError: null,
    licenseAccepted: false,
    licenseAcceptedAt: null,
    sizeBytes: 128774318,
    ...overrides,
  };
}

describe('LocalTtsEngineService', () => {
  let service: LocalTtsEngineService;
  let api: {
    getStatus: ReturnType<typeof vi.fn>;
    getLicense: ReturnType<typeof vi.fn>;
    install: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getStatus: vi.fn().mockResolvedValue(statusFixture()),
      getLicense: vi.fn().mockResolvedValue({ version: LICENSE_VERSION, text: 'full text' }),
      install: vi.fn().mockResolvedValue({ httpStatus: 202, reason: '' }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: DataLocalTtsService, useValue: api }] });
    service = TestBed.inject(LocalTtsEngineService);
  });

  afterEach(() => {
    service.detach();
    vi.useRealTimers();
  });

  it('allows the install only while the voice is neither installed nor pending', async () => {
    await service.attach();
    expect(service.canInstall()).toBe(true);

    api.getStatus.mockResolvedValue(statusFixture({ pending: true }));
    await service.refresh();
    expect(service.canInstall()).toBe(false);

    api.getStatus.mockResolvedValue(statusFixture({ installed: true }));
    await service.refresh();
    expect(service.canInstall()).toBe(false);
    expect(service.isInstalled()).toBe(true);
  });

  it('sends the explicit consent with the licence version it was given', async () => {
    await service.attach();
    const queued = await service.install(LICENSE_VERSION);

    expect(queued).toBe(true);
    expect(api.install).toHaveBeenCalledWith({ acceptLicense: true, licenseVersion: LICENSE_VERSION });
    expect(service.installErrorKey()).toBe('');
  });

  it.each([
    [400, LOCAL_TTS_KEYS.INSTALL_INVALID_CONSENT],
    [409, LOCAL_TTS_KEYS.INSTALL_CONFLICT],
    [403, LOCAL_TTS_KEYS.INSTALL_FAILED],
    [0, LOCAL_TTS_KEYS.INSTALL_FAILED],
  ])('reports a refused install (HTTP %s) with its own text', async (httpStatus, key) => {
    api.install.mockResolvedValue({ httpStatus, reason: '' });
    await service.attach();

    const queued = await service.install(LICENSE_VERSION);

    expect(queued).toBe(false);
    expect(service.installErrorKey()).toBe(key);
    expect(service.busy()).toBe(false);
  });

  it('shows the last error only while nothing is pending or installed', async () => {
    api.getStatus.mockResolvedValue(statusFixture({ lastError: 'download failed' }));
    await service.attach();
    expect(service.lastError()).toBe('download failed');

    api.getStatus.mockResolvedValue(statusFixture({ lastError: 'download failed', pending: true }));
    await service.refresh();
    expect(service.lastError()).toBeNull();
  });

  it('polls while the installation is pending and stops once it is done', async () => {
    vi.useFakeTimers();
    api.getStatus.mockResolvedValue(statusFixture({ pending: true }));
    await service.attach();
    expect(api.getStatus).toHaveBeenCalledTimes(1);

    api.getStatus.mockResolvedValue(statusFixture({ installed: true }));
    await vi.advanceTimersByTimeAsync(LOCAL_TTS_POLL_INTERVAL_MS);
    expect(api.getStatus).toHaveBeenCalledTimes(2);
    expect(service.isInstalled()).toBe(true);

    await vi.advanceTimersByTimeAsync(LOCAL_TTS_POLL_INTERVAL_MS * 3);
    expect(api.getStatus).toHaveBeenCalledTimes(2);
  });

  it('suspends the poll after repeated failures and keeps the last known status', async () => {
    vi.useFakeTimers();
    api.getStatus.mockResolvedValue(statusFixture({ pending: true }));
    await service.attach();

    api.getStatus.mockResolvedValue(null);
    await vi.advanceTimersByTimeAsync(LOCAL_TTS_POLL_INTERVAL_MS * 3);

    expect(service.pollingSuspended()).toBe(true);
    expect(service.status()?.pending).toBe(true);
    const calls = api.getStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(LOCAL_TTS_POLL_INTERVAL_MS * 3);
    expect(api.getStatus.mock.calls.length).toBe(calls);
  });

  it('flags a licence that could not be loaded', async () => {
    api.getLicense.mockResolvedValue(null);
    await service.loadLicense();
    expect(service.license()).toBeNull();
    expect(service.licenseLoadFailed()).toBe(true);
  });
});
