// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { UpdatesSettingComponent } from './updates-setting.component';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { UpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.model';
import { DataWhisperPluginService } from 'src/app/infrastructure/api/assistant/data-whisper-plugin.service';

describe('UpdatesSettingComponent', () => {
  let component: UpdatesSettingComponent;
  let fixture: ComponentFixture<UpdatesSettingComponent>;
  let mockUpdate: Partial<Record<keyof DataManagementUpdateService, ReturnType<typeof vi.fn>>>;
  let mockWhisperPlugin: Partial<Record<keyof DataWhisperPluginService, ReturnType<typeof vi.fn>>>;
  let updateConfigSignal: ReturnType<typeof signal<UpdateConfigSettings>>;
  let triggerSignal: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    mockUpdate = {
      getStatus: vi.fn().mockReturnValue(of({
        currentVersion: '1.0.0',
        availability: { currentVersion: '1.0.0', latestVersion: '1.2.0', containsMigrations: false, isUpdateAvailable: true },
        activeOperation: null,
        lastOperation: null,
      })),
      getHistory: vi.fn().mockReturnValue(of([])),
      triggerUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Update enqueued.' })),
      rollbackUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Rollback enqueued.' })),
      deleteHistoryEntry: vi.fn().mockReturnValue(of(true)),
    };

    mockWhisperPlugin = {
      install: vi.fn().mockResolvedValue({ enqueued: true, operationId: 'op-1', reason: 'Install enqueued.' }),
      uninstall: vi.fn().mockResolvedValue({ enqueued: true, operationId: 'op-2', reason: 'Uninstall enqueued.' }),
    };

    updateConfigSignal = signal(new UpdateConfigSettings());
    triggerSignal = signal(0);
    const mockSettings = {
      appSettings: { updateConfigSettings: updateConfigSignal },
      settingsChangeTrigger: triggerSignal,
    };

    await TestBed.configureTestingModule({
      imports: [UpdatesSettingComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementUpdateService, useValue: mockUpdate },
        { provide: DataManagementSettingsService, useValue: mockSettings },
        { provide: DataWhisperPluginService, useValue: mockWhisperPlugin },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdatesSettingComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads status + history on init', () => {
    fixture.detectChanges();
    expect(mockUpdate.getStatus).toHaveBeenCalled();
    expect(mockUpdate.getHistory).toHaveBeenCalled();
    expect(component.status()?.availability?.isUpdateAvailable).toBe(true);
  });

  it('mirrors the central auto-update config into the local form', () => {
    updateConfigSignal.set({ ...new UpdateConfigSettings(), channel: 'Beta', autoEnabled: true });
    fixture.detectChanges();
    expect(component.config()?.channel).toBe('Beta');
    expect(component.config()?.autoEnabled).toBe(true);
  });

  it('persists config changes via the settings auto-save mechanism', () => {
    fixture.detectChanges();
    component.config.set({ ...component.config()!, channel: 'Beta' });
    component.onConfigChange();
    expect(updateConfigSignal().channel).toBe('Beta');
    expect(triggerSignal()).toBeGreaterThan(0);
  });

  it('triggers an update and stores the action message', async () => {
    fixture.detectChanges();
    await component.triggerNow();
    expect(mockUpdate.triggerUpdate).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Update enqueued.');
  });

  it('allows continuing a Pending WhisperInstall history entry', () => {
    fixture.detectChanges();
    expect(component.canContinueHistoryEntry({
      id: '1',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date().toISOString(),
    })).toBe(true);
  });

  it('deletes the stale Pending row first, then re-issues the model install', async () => {
    fixture.detectChanges();
    await component.continueHistoryEntry({
      id: '1',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: '2026-08-06T00:00:00Z',
    });
    expect(mockUpdate.deleteHistoryEntry).toHaveBeenCalledWith('1');
    expect(mockWhisperPlugin.install).toHaveBeenCalledWith('large-v3-turbo');
    expect(component.actionMessage()).toBe('Install enqueued.');
  });

  it('re-issues the uninstall when continuing a Failed WhisperUninstall entry without deleting first', async () => {
    fixture.detectChanges();
    await component.continueHistoryEntry({
      id: '2',
      operationType: 'WhisperUninstall',
      status: 'Failed',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: '',
      containsMigrations: false,
      requestedAt: '2026-08-06T00:00:00Z',
    });
    expect(mockUpdate.deleteHistoryEntry).not.toHaveBeenCalled();
    expect(mockWhisperPlugin.uninstall).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Uninstall enqueued.');
  });

  it('deletes the stale Pending row first, then re-triggers a plain Update entry', async () => {
    fixture.detectChanges();
    await component.continueHistoryEntry({
      id: '3',
      operationType: 'Update',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '1.0.0',
      targetVersion: '1.2.0',
      containsMigrations: false,
      requestedAt: '2026-08-06T00:00:00Z',
    });
    expect(mockUpdate.deleteHistoryEntry).toHaveBeenCalledWith('3');
    expect(mockUpdate.triggerUpdate).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Update enqueued.');
  });

  it('marks a long-queued row that no updater claimed as awaiting the update service', () => {
    fixture.detectChanges();
    expect(component.isAwaitingUpdater({
      id: '4',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
    })).toBe(true);
  });

  it('renders the waiting status and no retry button for an unclaimed row', () => {
    mockUpdate.getHistory!.mockReturnValue(of([{
      id: '7',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
    }]));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('settings.updates.history.status-awaiting');
    expect(element.querySelector('app-icon-refresh-grey')).toBeFalsy();
    expect(element.querySelector('app-icon-trash-red')).toBeTruthy();
  });

  it('stops offering a retry on a row that is only waiting for the update service', () => {
    fixture.detectChanges();
    expect(component.canContinueHistoryEntry({
      id: '6',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
    })).toBe(false);
  });

  it('leaves a claimed row untouched however long it runs', () => {
    fixture.detectChanges();
    expect(component.isAwaitingUpdater({
      id: '5',
      operationType: 'Update',
      status: 'Running',
      channel: 'Stable',
      fromVersion: '1.0.0',
      targetVersion: '1.2.0',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
      startedAt: new Date(Date.now() - 590000).toISOString(),
    })).toBe(false);
  });
});
