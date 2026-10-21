// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { WhisperPluginSettingComponent } from './whisper-plugin-setting.component';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { WhisperOperationInfo } from 'src/app/domain/models/assistant/whisper-operation-info.interface';
import { WhisperPluginStatus } from 'src/app/domain/models/assistant/whisper-plugin-status.interface';

const MINUTE_MS = 60000;

describe('WhisperPluginSettingComponent', () => {
  let component: WhisperPluginSettingComponent;
  let fixture: ComponentFixture<WhisperPluginSettingComponent>;
  let mockUpdateService: Partial<Record<keyof DataManagementUpdateService, ReturnType<typeof vi.fn>>>;

  const queuedOperation = (ageMinutes: number, startedAt: string | null): WhisperOperationInfo => ({
    id: 'op-stuck',
    operationType: 'WhisperInstall',
    status: 'Pending',
    modelAlias: WhisperModelAliases.LargeV3Turbo,
    message: null,
    requestedAt: new Date(Date.now() - ageMinutes * MINUTE_MS).toISOString(),
    startedAt,
    completedAt: null,
  });

  const notInstalledStatus: WhisperPluginStatus = {
    installed: false,
    modelAlias: null,
    modelId: null,
    activeOperation: null,
    lastOperation: null,
    otherOperationActive: false,
  };

  const installedStatus: WhisperPluginStatus = {
    ...notInstalledStatus,
    installed: true,
    modelAlias: WhisperModelAliases.Small,
    modelId: 'Systran/faster-whisper-small',
  };

  beforeEach(async () => {
    mockUpdateService = {
      deleteHistoryEntry: vi.fn().mockReturnValue(of(void 0)),
      getWhisperPluginStatus: vi.fn().mockResolvedValue(notInstalledStatus),
      installWhisperPlugin: vi.fn().mockResolvedValue({
        enqueued: true,
        operationId: 'op-1',
        reason: 'Install enqueued.',
      }),
      uninstallWhisperPlugin: vi.fn().mockResolvedValue({
        enqueued: true,
        operationId: 'op-2',
        reason: 'Uninstall enqueued.',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [WhisperPluginSettingComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementUpdateService, useValue: mockUpdateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WhisperPluginSettingComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads the status on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalled();
    expect(component.status()?.installed).toBe(false);
  });

  it('defaults the model selection to large-v3-turbo', () => {
    expect(component.selectedModel()).toBe(WhisperModelAliases.LargeV3Turbo);
  });

  it('syncs the model selection to the installed model', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(installedStatus);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.selectedModel()).toBe(WhisperModelAliases.Small);
  });

  it('installs the selected model and stores the action message', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await component.install();
    expect(mockUpdateService.installWhisperPlugin).toHaveBeenCalledWith(WhisperModelAliases.LargeV3Turbo);
    expect(component.actionMessage()).toBe('Install enqueued.');
  });

  it('uninstalls and stores the action message', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(installedStatus);
    fixture.detectChanges();
    await fixture.whenStable();
    await component.uninstall();
    expect(mockUpdateService.uninstallWhisperPlugin).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Uninstall enqueued.');
  });

  it('enables the model switch only when a different model is selected', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(installedStatus);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.canSwitchModel()).toBe(false);
    component.onModelSelected(WhisperModelAliases.LargeV3Turbo);
    expect(component.canSwitchModel()).toBe(true);
  });

  it('disables actions while another updater operation is active', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      otherOperationActive: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.actionsDisabled()).toBe(true);
  });

  it('reports a long-queued operation that no updater claimed', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      activeOperation: queuedOperation(20, null),
    });
    await component.reload();
    expect(component.awaitingUpdater()).toBe(true);
    expect(component.waitingMinutes()).toBe(20);
    component.ngOnDestroy();
  });

  it('renders the discard button instead of the install button while waiting for the updater', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      activeOperation: queuedOperation(20, null),
    });
    await component.reload();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('#whisper-plugin-discard-btn')).toBeTruthy();
    expect(element.querySelector('#whisper-plugin-install-btn')).toBeFalsy();
    expect(element.textContent).toContain('setting.speech.whisper-plugin.status-awaiting-updater');
    expect(element.textContent).not.toContain('setting.speech.whisper-plugin.install-hint');
    component.ngOnDestroy();
  });

  it('keeps a freshly queued operation as in progress', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      activeOperation: queuedOperation(1, null),
    });
    await component.reload();
    expect(component.awaitingUpdater()).toBe(false);
    component.ngOnDestroy();
  });

  it('keeps a claimed operation as in progress however long it runs', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      activeOperation: {
        ...queuedOperation(40, new Date(Date.now() - 30 * MINUTE_MS).toISOString()),
        status: 'Running',
      },
    });
    await component.reload();
    expect(component.awaitingUpdater()).toBe(false);
    component.ngOnDestroy();
  });

  it('discards a stuck request and reloads the status', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      activeOperation: queuedOperation(20, null),
    });
    await component.reload();

    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(notInstalledStatus);
    await component.discardRequest();

    expect(mockUpdateService.deleteHistoryEntry).toHaveBeenCalledWith('op-stuck');
    expect(component.awaitingUpdater()).toBe(false);
  });

  it('shows the live operation when the updater claimed the request mid-discard', async () => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      activeOperation: queuedOperation(20, null),
    });
    await component.reload();

    mockUpdateService.deleteHistoryEntry!.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Conflict })),
    );
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue({
      ...notInstalledStatus,
      activeOperation: {
        ...queuedOperation(20, new Date().toISOString()),
        status: 'Running',
      },
    });

    await component.discardRequest();

    expect(component.awaitingUpdater()).toBe(false);
    expect(component.status()?.activeOperation?.status).toBe('Running');
    component.ngOnDestroy();
  });
});
