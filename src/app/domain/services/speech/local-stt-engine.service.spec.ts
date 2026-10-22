// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { LocalSttEngineService } from './local-stt-engine.service';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { WhisperOperationStatuses, WhisperOperationTypes } from 'src/app/domain/constants/whisper-operation.constants';
import { WhisperOperationInfo } from 'src/app/domain/models/assistant/whisper-operation-info.interface';
import { WhisperPluginStatus } from 'src/app/domain/models/assistant/whisper-plugin-status.interface';

const MINUTE_MS = 60000;
const POLL_INTERVAL_MS = 5000;
const DOCKER_ALIASES = [WhisperModelAliases.Parakeet, WhisperModelAliases.Small, WhisperModelAliases.LargeV3Turbo];

describe('LocalSttEngineService', () => {
  let service: LocalSttEngineService;
  let mockUpdateService: Partial<Record<keyof DataManagementUpdateService, ReturnType<typeof vi.fn>>>;

  const operation = (overrides: Partial<WhisperOperationInfo> = {}): WhisperOperationInfo => ({
    id: 'op-1',
    operationType: WhisperOperationTypes.Install,
    status: WhisperOperationStatuses.Running,
    modelAlias: WhisperModelAliases.Parakeet,
    message: null,
    requestedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  });

  const notInstalled: WhisperPluginStatus = {
    installed: false,
    modelAlias: null,
    modelId: null,
    activeOperation: null,
    lastOperation: null,
    otherOperationActive: false,
    supportedAliases: DOCKER_ALIASES,
  };

  const installedParakeet: WhisperPluginStatus = {
    ...notInstalled,
    installed: true,
    modelAlias: WhisperModelAliases.Parakeet,
    modelId: 'parakeet-tdt-0.6b-v3-int8',
  };

  beforeEach(() => {
    mockUpdateService = {
      getWhisperPluginStatus: vi.fn().mockResolvedValue(notInstalled),
      installWhisperPlugin: vi.fn().mockResolvedValue({ enqueued: true, operationId: 'op-1', reason: 'Install enqueued.' }),
      uninstallWhisperPlugin: vi.fn().mockResolvedValue({ enqueued: true, operationId: 'op-2', reason: 'Uninstall enqueued.' }),
      deleteHistoryEntry: vi.fn().mockReturnValue(of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: DataManagementUpdateService, useValue: mockUpdateService }],
    });
    service = TestBed.inject(LocalSttEngineService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes nothing before the first status arrives', () => {
    expect(service.status()).toBeNull();
    expect(service.isInstalled()).toBe(false);
    expect(service.supportedAliases()).toEqual([]);
    expect(service.actionsDisabled()).toBe(true);
  });

  it('derives installed alias, engine name and supported aliases from the status', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(installedParakeet);
    await service.refresh();

    expect(service.isInstalled()).toBe(true);
    expect(service.installedAlias()).toBe(WhisperModelAliases.Parakeet);
    expect(service.installedEngineName()).toBe('Parakeet');
    expect(service.supportedAliases()).toEqual(DOCKER_ALIASES);
    expect(service.supportsWhisper()).toBe(true);
    expect(service.actionsDisabled()).toBe(false);
  });

  it('names the Whisper engines', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...installedParakeet,
      modelAlias: WhisperModelAliases.LargeV3Turbo,
    });
    await service.refresh();
    expect(service.installedEngineName()).toBe('Whisper turbo');
  });

  it('reports no Whisper support on a native installation', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalled,
      supportedAliases: [WhisperModelAliases.Parakeet],
    });
    await service.refresh();
    expect(service.supportsWhisper()).toBe(false);
  });

  it('exposes the last failed install while nothing is installed or running', async () => {
    const failed = operation({ status: WhisperOperationStatuses.Failed, message: 'Download failed' });
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({ ...notInstalled, lastOperation: failed });
    await service.refresh();
    expect(service.failedInstall()).toEqual(failed);
  });

  it('does not report a failed install after a successful install', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...installedParakeet,
      lastOperation: operation({ status: WhisperOperationStatuses.Failed }),
    });
    await service.refresh();
    expect(service.failedInstall()).toBeNull();
  });

  it('tells install and uninstall operations apart', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...installedParakeet,
      activeOperation: operation({ operationType: WhisperOperationTypes.Uninstall }),
    });
    await service.refresh();
    expect(service.uninstallActive()).toBe(true);
    expect(service.installActive()).toBe(false);
  });

  it('flags a long-queued operation that no updater claimed', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalled,
      activeOperation: operation({
        status: WhisperOperationStatuses.Pending,
        startedAt: null,
        requestedAt: new Date(Date.now() - 20 * MINUTE_MS).toISOString(),
      }),
    });
    await service.refresh();
    expect(service.awaitingUpdater()).toBe(true);
    expect(service.waitingMinutes()).toBe(20);
  });

  it('keeps the last known status when a status request fails', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(installedParakeet);
    await service.refresh();
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(null);
    await service.refresh();
    expect(service.isInstalled()).toBe(true);
  });

  describe('polling', () => {
    const runningStatus: WhisperPluginStatus = { ...notInstalled, activeOperation: operation() };

    it('polls every 5 seconds while an operation is active and stops once it ends', async () => {
      vi.useFakeTimers();
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(runningStatus);
      await service.attach();
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(2);

      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(installedParakeet);
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(3);
      expect(service.isInstalled()).toBe(true);

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(3);
      service.detach();
    });

    it('does not poll while nothing is running', async () => {
      vi.useFakeTimers();
      await service.attach();
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(1);
      service.detach();
    });

    it('does not poll without an attached consumer', async () => {
      vi.useFakeTimers();
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(runningStatus);
      await service.refresh();
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(1);
    });

    it('runs one shared loop and stops only when the last consumer detaches', async () => {
      vi.useFakeTimers();
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(runningStatus);
      await service.attach();
      await service.attach();
      mockUpdateService.getWhisperPluginStatus!.mockClear();

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(1);

      service.detach();
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(2);

      service.detach();
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(2);
    });

    it('keeps polling through a failed status request', async () => {
      vi.useFakeTimers();
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(runningStatus);
      await service.attach();

      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(null);
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(runningStatus);
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

      expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalledTimes(3);
      service.detach();
    });
  });

  describe('actions', () => {
    beforeEach(async () => {
      await service.refresh();
    });

    it('installs the given alias and keeps the reason', async () => {
      await service.install(WhisperModelAliases.Parakeet);

      expect(mockUpdateService.installWhisperPlugin).toHaveBeenCalledWith(WhisperModelAliases.Parakeet);
      expect(service.actionMessage()).toBe('Install enqueued.');
      expect(service.rejectionReason()).toBe('');
      expect(service.busy()).toBe(false);
    });

    it('keeps the reason as rejection when the queue refuses the request', async () => {
      mockUpdateService.installWhisperPlugin!.mockResolvedValue({
        enqueued: false,
        operationId: null,
        reason: 'Whisper model is not supported on this installation.',
      });

      await service.install(WhisperModelAliases.Small);

      expect(service.rejectionReason()).toBe('Whisper model is not supported on this installation.');
    });

    it('uninstalls and keeps the reason', async () => {
      await service.uninstall();
      expect(mockUpdateService.uninstallWhisperPlugin).toHaveBeenCalled();
      expect(service.actionMessage()).toBe('Uninstall enqueued.');
    });

    it('discards the active request and refreshes', async () => {
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({ ...notInstalled, activeOperation: operation({ id: 'op-stuck' }) });
      await service.refresh();
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(notInstalled);

      await service.discardRequest();

      expect(mockUpdateService.deleteHistoryEntry).toHaveBeenCalledWith('op-stuck');
      expect(service.activeOperation()).toBeNull();
      expect(service.busy()).toBe(false);
    });

    it('treats a conflict while discarding as the updater having claimed the request', async () => {
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({ ...notInstalled, activeOperation: operation({ id: 'op-stuck' }) });
      await service.refresh();
      mockUpdateService.deleteHistoryEntry!.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Conflict })),
      );

      await service.discardRequest();

      expect(service.activeOperation()?.id).toBe('op-stuck');
    });

    it('rethrows other discard errors and releases the busy flag', async () => {
      mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({ ...notInstalled, activeOperation: operation() });
      await service.refresh();
      mockUpdateService.deleteHistoryEntry!.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: HttpStatusCode.InternalServerError })),
      );

      await expect(service.discardRequest()).rejects.toBeInstanceOf(HttpErrorResponse);
      expect(service.busy()).toBe(false);
    });

    it('does nothing when there is no active request to discard', async () => {
      await service.discardRequest();
      expect(mockUpdateService.deleteHistoryEntry).not.toHaveBeenCalled();
    });
  });
});
