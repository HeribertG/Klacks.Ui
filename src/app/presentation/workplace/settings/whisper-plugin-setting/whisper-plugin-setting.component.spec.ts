// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { WhisperPluginSettingComponent } from './whisper-plugin-setting.component';
import {
  DataWhisperPluginService,
  WhisperModelAliases,
  WhisperPluginStatus,
} from 'src/app/infrastructure/api/assistant/data-whisper-plugin.service';

describe('WhisperPluginSettingComponent', () => {
  let component: WhisperPluginSettingComponent;
  let fixture: ComponentFixture<WhisperPluginSettingComponent>;
  let mockService: Partial<Record<keyof DataWhisperPluginService, ReturnType<typeof vi.fn>>>;

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
    mockService = {
      getStatus: vi.fn().mockResolvedValue(notInstalledStatus),
      install: vi.fn().mockResolvedValue({
        enqueued: true,
        operationId: 'op-1',
        reason: 'Install enqueued.',
      }),
      uninstall: vi.fn().mockResolvedValue({
        enqueued: true,
        operationId: 'op-2',
        reason: 'Uninstall enqueued.',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [WhisperPluginSettingComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataWhisperPluginService, useValue: mockService }],
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
    expect(mockService.getStatus).toHaveBeenCalled();
    expect(component.status()?.installed).toBe(false);
  });

  it('defaults the model selection to large-v3-turbo', () => {
    expect(component.selectedModel()).toBe(WhisperModelAliases.LargeV3Turbo);
  });

  it('syncs the model selection to the installed model', async () => {
    mockService.getStatus!.mockResolvedValue(installedStatus);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.selectedModel()).toBe(WhisperModelAliases.Small);
  });

  it('installs the selected model and stores the action message', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await component.install();
    expect(mockService.install).toHaveBeenCalledWith(WhisperModelAliases.LargeV3Turbo);
    expect(component.actionMessage()).toBe('Install enqueued.');
  });

  it('uninstalls and stores the action message', async () => {
    mockService.getStatus!.mockResolvedValue(installedStatus);
    fixture.detectChanges();
    await fixture.whenStable();
    await component.uninstall();
    expect(mockService.uninstall).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Uninstall enqueued.');
  });

  it('enables the model switch only when a different model is selected', async () => {
    mockService.getStatus!.mockResolvedValue(installedStatus);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.canSwitchModel()).toBe(false);
    component.onModelSelected(WhisperModelAliases.LargeV3Turbo);
    expect(component.canSwitchModel()).toBe(true);
  });

  it('disables actions while another updater operation is active', async () => {
    mockService.getStatus!.mockResolvedValue({
      ...notInstalledStatus,
      otherOperationActive: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.actionsDisabled()).toBe(true);
  });
});
