// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

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
    modelAlias: WhisperModelAliases.Parakeet,
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
    supportedAliases: [WhisperModelAliases.Parakeet, WhisperModelAliases.Small, WhisperModelAliases.LargeV3Turbo],
  };

  const installedStatus: WhisperPluginStatus = {
    ...notInstalledStatus,
    installed: true,
    modelAlias: WhisperModelAliases.Small,
    modelId: 'Systran/faster-whisper-small',
  };

  const nativeStatus: WhisperPluginStatus = {
    ...notInstalledStatus,
    supportedAliases: [WhisperModelAliases.Parakeet],
  };

  const radioLabels = (): string[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLLabelElement>('label.checkbox-label')).map(
      (label) => (label.textContent ?? '').trim(),
    );

  const load = async (status: WhisperPluginStatus): Promise<void> => {
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(status);
    fixture.detectChanges();
    await vi.waitFor(() => expect(component.localStt.status()).not.toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
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
      providers: [{ provide: DataManagementUpdateService, useValue: mockUpdateService }],
    }).compileComponents();

    fixture = TestBed.createComponent(WhisperPluginSettingComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads the status on init', async () => {
    await load(notInstalledStatus);
    expect(mockUpdateService.getWhisperPluginStatus).toHaveBeenCalled();
    expect(component.localStt.status()?.installed).toBe(false);
  });

  it('defaults the model selection to Parakeet', () => {
    expect(component.selectedModel()).toBe(WhisperModelAliases.Parakeet);
  });

  it('renders Parakeet first, then the two Whisper engines, on a Docker installation', async () => {
    await load(notInstalledStatus);
    expect(radioLabels()).toEqual([
      'setting.speech.whisper-plugin.model-parakeet',
      'setting.speech.whisper-plugin.model-small',
      'setting.speech.whisper-plugin.model-large',
    ]);
  });

  it('hides the Whisper engines the installation cannot run', async () => {
    await load(nativeStatus);
    expect(radioLabels()).toEqual(['setting.speech.whisper-plugin.model-parakeet']);
  });

  it('shows the Parakeet attribution while Parakeet is selected', async () => {
    await load(notInstalledStatus);
    expect((fixture.nativeElement as HTMLElement).querySelector('#whisper-plugin-setting-attribution')).toBeTruthy();

    component.onModelSelected(WhisperModelAliases.Small);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('#whisper-plugin-setting-attribution')).toBeFalsy();
  });

  it('syncs the model selection to the installed model', async () => {
    await load(installedStatus);
    expect(component.selectedModel()).toBe(WhisperModelAliases.Small);
  });

  it('installs the selected model and stores the action message', async () => {
    await load(notInstalledStatus);
    await component.install();
    expect(mockUpdateService.installWhisperPlugin).toHaveBeenCalledWith(WhisperModelAliases.Parakeet);
    expect(component.localStt.actionMessage()).toBe('Install enqueued.');
  });

  it('installs Whisper small when that radio is chosen', async () => {
    await load(notInstalledStatus);
    component.onModelSelected(WhisperModelAliases.Small);
    await component.install();
    expect(mockUpdateService.installWhisperPlugin).toHaveBeenCalledWith(WhisperModelAliases.Small);
  });

  it('uninstalls through the shared service', async () => {
    await load(installedStatus);
    await component.localStt.uninstall();
    expect(mockUpdateService.uninstallWhisperPlugin).toHaveBeenCalled();
    expect(component.localStt.actionMessage()).toBe('Uninstall enqueued.');
  });

  it('enables the model switch only when a different model is selected', async () => {
    await load(installedStatus);
    expect(component.canSwitchModel()).toBe(false);
    component.onModelSelected(WhisperModelAliases.Parakeet);
    expect(component.canSwitchModel()).toBe(true);
  });

  it('disables actions while another updater operation is active', async () => {
    await load({ ...notInstalledStatus, otherOperationActive: true });
    expect(component.localStt.actionsDisabled()).toBe(true);
  });

  it('renders the discard button instead of the install button while waiting for the updater', async () => {
    await load({ ...notInstalledStatus, activeOperation: queuedOperation(20, null) });

    const element: HTMLElement = fixture.nativeElement;
    expect(component.localStt.awaitingUpdater()).toBe(true);
    expect(element.querySelector('#whisper-plugin-discard-btn')).toBeTruthy();
    expect(element.querySelector('#whisper-plugin-install-btn')).toBeFalsy();
    expect(element.textContent).toContain('setting.speech.whisper-plugin.status-awaiting-updater');
    expect(element.textContent).not.toContain('setting.speech.whisper-plugin.install-hint');
  });

  it('keeps a freshly queued operation as in progress', async () => {
    await load({ ...notInstalledStatus, activeOperation: queuedOperation(1, null) });
    expect(component.localStt.awaitingUpdater()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('setting.speech.whisper-plugin.install-hint');
  });

  it('discards a stuck request through the discard button', async () => {
    await load({ ...notInstalledStatus, activeOperation: queuedOperation(20, null) });
    mockUpdateService.getWhisperPluginStatus!.mockResolvedValue(notInstalledStatus);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#whisper-plugin-discard-btn')!.click();
    await vi.waitFor(() => expect(mockUpdateService.deleteHistoryEntry).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(mockUpdateService.deleteHistoryEntry).toHaveBeenCalledWith('op-stuck');
    expect(component.localStt.awaitingUpdater()).toBe(false);
  });

  it('shows a refused request in the error style', async () => {
    mockUpdateService.installWhisperPlugin!.mockResolvedValue({
      enqueued: false,
      operationId: null,
      reason: 'Whisper model is not supported on this installation.',
    });
    await load(notInstalledStatus);
    await component.install();
    fixture.detectChanges();

    const refused = (fixture.nativeElement as HTMLElement).querySelector('p.status-text-error');
    expect(refused?.textContent).toContain('Whisper model is not supported on this installation.');
  });
});
