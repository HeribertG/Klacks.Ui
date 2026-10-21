// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { WhisperPluginStatus } from 'src/app/domain/models/assistant/whisper-plugin-status.interface';
import { DataWhisperPluginService } from 'src/app/infrastructure/api/assistant/data-whisper-plugin.service';
import { DataUpdateService } from 'src/app/infrastructure/api/settings/data-update.service';
import { DataManagementUpdateService } from './data-management-update.service';

describe('DataManagementUpdateService whisper plugin operations', () => {
  let service: DataManagementUpdateService;
  let whisperApi: {
    getStatus: ReturnType<typeof vi.fn>;
    install: ReturnType<typeof vi.fn>;
    uninstall: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    whisperApi = { getStatus: vi.fn(), install: vi.fn(), uninstall: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        DataManagementUpdateService,
        { provide: DataUpdateService, useValue: {} },
        { provide: DataWhisperPluginService, useValue: whisperApi },
      ],
    });
    service = TestBed.inject(DataManagementUpdateService);
  });

  it('reads the plugin status, which is null while the endpoint is unreachable', async () => {
    const status = { installed: true } as WhisperPluginStatus;
    whisperApi.getStatus.mockResolvedValueOnce(status).mockResolvedValueOnce(null);

    await expect(service.getWhisperPluginStatus()).resolves.toBe(status);
    await expect(service.getWhisperPluginStatus()).resolves.toBeNull();
  });

  it('enqueues the install of the chosen model', async () => {
    const result = { enqueued: true, operationId: 'op-1', reason: 'Install enqueued.' };
    whisperApi.install.mockResolvedValue(result);

    await expect(service.installWhisperPlugin(WhisperModelAliases.Small)).resolves.toBe(result);
    expect(whisperApi.install).toHaveBeenCalledWith(WhisperModelAliases.Small);
  });

  it('enqueues the uninstall', async () => {
    const result = { enqueued: true, operationId: 'op-2', reason: 'Uninstall enqueued.' };
    whisperApi.uninstall.mockResolvedValue(result);

    await expect(service.uninstallWhisperPlugin()).resolves.toBe(result);
  });
});
